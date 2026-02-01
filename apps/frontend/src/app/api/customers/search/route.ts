import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer Search API - Phase 5 Optimization
 * 
 * Provides intelligent customer search with suggestions, fuzzy matching, and relevance scoring.
 * Optimized for real-time search with minimal latency.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }

    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const includeSuggestions = searchParams.get('suggestions') === 'true';
    const includeStats = searchParams.get('stats') === 'true';

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          suggestions: [],
          stats: { totalResults: 0, searchTime: 0 }
        }
      });
    }

    const startTime = performance.now();
    const searchTerm = query.trim();

    // Build search query with relevance scoring
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        created_at
      `)
      .eq('organization_id', orgId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(limit * 2); // Get more results for relevance scoring

    if (error) {
      throw new Error(error.message);
    }

    // Score and rank results by relevance
    const scoredResults = (customers || []).map((customer: any) => {
      const score = calculateRelevanceScore(customer, searchTerm);
      return {
        customer: transformCustomerData(customer),
        score,
        matchedFields: getMatchedFields(customer, searchTerm)
      };
    })
    .filter((item: any) => item.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);

    const results = scoredResults.map((item: any) => ({
      ...item.customer,
      _relevanceScore: item.score,
      _matchedFields: item.matchedFields
    }));

    const searchTime = Math.round(performance.now() - startTime);

    // Generate suggestions if requested
    let suggestions: string[] = [];
    if (includeSuggestions && results.length < limit) {
      suggestions = await generateSearchSuggestions(supabase, searchTerm, orgId);
    }

    // Generate search stats if requested
    let stats = { totalResults: results.length, searchTime };
    if (includeStats) {
      stats = {
        ...stats,
        ...await generateSearchStats(supabase, searchTerm, results.length, orgId)
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        suggestions,
        stats,
        query: searchTerm
      }
    });

  } catch (error) {
    console.error('Error in customer search:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search customers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateRelevanceScore(customer: any, searchTerm: string): number {
  let score = 0;
  const term = searchTerm.toLowerCase();

  // Exact matches get highest scores
  if (customer.name?.toLowerCase() === term) score += 100;
  if (customer.email?.toLowerCase() === term) score += 90;
  if (customer.customer_code?.toLowerCase() === term) score += 95;
  if (customer.phone?.toLowerCase() === term) score += 85;

  // Starts with matches
  if (customer.name?.toLowerCase().startsWith(term)) score += 50;
  if (customer.email?.toLowerCase().startsWith(term)) score += 45;
  if (customer.customer_code?.toLowerCase().startsWith(term)) score += 48;

  // Contains matches (weighted by field importance)
  if (customer.name?.toLowerCase().includes(term)) score += 30;
  if (customer.email?.toLowerCase().includes(term)) score += 25;
  if (customer.customer_code?.toLowerCase().includes(term)) score += 28;
  if (customer.phone?.toLowerCase().includes(term)) score += 20;

  // Boost active customers
  if (customer.is_active) score += 5;

  // Boost high-value customers
  if (customer.total_purchases > 10000) score += 10;
  else if (customer.total_purchases > 5000) score += 5;

  // Boost frequent customers
  if (customer.total_orders > 20) score += 8;
  else if (customer.total_orders > 10) score += 4;

  // Recent activity boost
  if (customer.last_purchase) {
    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastPurchase < 30) score += 3;
  }

  return score;
}

function getMatchedFields(customer: any, searchTerm: string): string[] {
  const matchedFields: string[] = [];
  const term = searchTerm.toLowerCase();

  if (customer.name?.toLowerCase().includes(term)) matchedFields.push('name');
  if (customer.email?.toLowerCase().includes(term)) matchedFields.push('email');
  if (customer.customer_code?.toLowerCase().includes(term)) matchedFields.push('customer_code');
  if (customer.phone?.toLowerCase().includes(term)) matchedFields.push('phone');

  return matchedFields;
}

function transformCustomerData(customer: any) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    customerCode: customer.customer_code,
    customerType: mapCustomerTypeToUI(customer.customer_type),
    isActive: customer.is_active,
    totalSpent: customer.total_purchases || 0,
    totalOrders: customer.total_orders || 0,
    lastPurchase: customer.last_purchase,
    createdAt: customer.created_at,
    // Add computed fields for search context
    segment: determineCustomerSegment(customer.total_orders || 0, customer.total_purchases || 0),
    valueLevel: getValueLevel(customer.total_purchases || 0)
  };
}

async function generateSearchSuggestions(supabase: any, searchTerm: string, orgId: string): Promise<string[]> {
  const suggestions: Set<string> = new Set();
  const term = searchTerm.toLowerCase();

  try {
    // Get customers with names starting with the search term
    const { data: nameMatches } = await supabase
      .from('customers')
      .select('name')
      .eq('organization_id', orgId)
      .ilike('name', `${term}%`)
      .limit(5);

    nameMatches?.forEach((customer: any) => {
      if (customer.name && customer.name.toLowerCase() !== term) {
        suggestions.add(customer.name);
      }
    });

    // Get customers with emails starting with the search term
    const { data: emailMatches } = await supabase
      .from('customers')
      .select('email')
      .eq('organization_id', orgId)
      .ilike('email', `${term}%`)
      .limit(3);

    emailMatches?.forEach((customer: any) => {
      if (customer.email && customer.email.toLowerCase() !== term) {
        suggestions.add(customer.email);
      }
    });

    // Get customer codes starting with the search term
    const { data: codeMatches } = await supabase
      .from('customers')
      .select('customer_code')
      .eq('organization_id', orgId)
      .ilike('customer_code', `${term}%`)
      .limit(3);

    codeMatches?.forEach((customer: any) => {
      if (customer.customer_code && customer.customer_code.toLowerCase() !== term) {
        suggestions.add(customer.customer_code);
      }
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
  }

  return Array.from(suggestions).slice(0, 5);
}

async function generateSearchStats(supabase: any, searchTerm: string, resultCount: number, orgId: string) {
  try {
    // Get total possible matches (without limit)
    const { count: totalMatches } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

    // Get match distribution by field
    const [
      { count: nameMatches },
      { count: emailMatches },
      { count: codeMatches },
      { count: phoneMatches }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).ilike('name', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).ilike('email', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).ilike('customer_code', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).ilike('phone', `%${searchTerm}%`)
    ]);

    return {
      totalMatches: totalMatches || 0,
      returnedResults: resultCount,
      matchDistribution: {
        name: nameMatches || 0,
        email: emailMatches || 0,
        customerCode: codeMatches || 0,
        phone: phoneMatches || 0
      }
    };
  } catch (error) {
    console.error('Error generating search stats:', error);
    return {
      totalMatches: resultCount,
      returnedResults: resultCount,
      matchDistribution: { name: 0, email: 0, customerCode: 0, phone: 0 }
    };
  }
}

// Helper functions
function mapCustomerTypeToUI(dbType: string): 'regular' | 'vip' | 'wholesale' {
  const normalized = dbType?.toUpperCase();
  if (normalized === 'WHOLESALE') return 'wholesale';
  if (normalized === 'VIP') return 'vip';
  return 'regular';
}

function determineCustomerSegment(totalOrders: number, totalSpent: number): 'new' | 'regular' | 'frequent' | 'vip' {
  if (totalOrders <= 2) return 'new';
  if (totalOrders >= 25 || totalSpent > 50000) return 'vip';
  if (totalOrders >= 11) return 'frequent';
  return 'regular';
}

function getValueLevel(totalSpent: number): 'low' | 'medium' | 'high' | 'premium' {
  if (totalSpent > 50000) return 'premium';
  if (totalSpent > 10000) return 'high';
  if (totalSpent > 2000) return 'medium';
  return 'low';
}
