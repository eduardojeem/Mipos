import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  resolveCustomerOrganizationId,
  transformCustomerRecord,
} from '@/app/api/customers/_lib';

/**
 * Customer Search API - Phase 5 Optimization
 *
 * Provides intelligent customer search with suggestions, fuzzy matching, and relevance scoring.
 * Optimized for real-time search with minimal latency.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
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

    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        tax_id,
        ruc,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        birth_date,
        notes,
        created_at,
        updated_at
      `)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(limit * 2);

    if (error) {
      throw new Error(error.message);
    }

    const scoredResults = (customers || [])
      .map((customer: any) => {
        const score = calculateRelevanceScore(customer, searchTerm);
        const transformedCustomer = transformCustomerRecord(customer);

        return {
          customer: {
            ...transformedCustomer,
            valueLevel: getValueLevel(transformedCustomer.totalSpent || 0),
          },
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

    let suggestions: string[] = [];
    if (includeSuggestions && results.length < limit) {
      suggestions = await generateSearchSuggestions(supabase, searchTerm, orgId);
    }

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

  if (customer.name?.toLowerCase() === term) score += 100;
  if (customer.email?.toLowerCase() === term) score += 90;
  if (customer.customer_code?.toLowerCase() === term) score += 95;
  if (customer.phone?.toLowerCase() === term) score += 85;

  if (customer.name?.toLowerCase().startsWith(term)) score += 50;
  if (customer.email?.toLowerCase().startsWith(term)) score += 45;
  if (customer.customer_code?.toLowerCase().startsWith(term)) score += 48;

  if (customer.name?.toLowerCase().includes(term)) score += 30;
  if (customer.email?.toLowerCase().includes(term)) score += 25;
  if (customer.customer_code?.toLowerCase().includes(term)) score += 28;
  if (customer.phone?.toLowerCase().includes(term)) score += 20;

  if (customer.is_active) score += 5;

  if (customer.total_purchases > 10000) score += 10;
  else if (customer.total_purchases > 5000) score += 5;

  if (customer.total_orders > 20) score += 8;
  else if (customer.total_orders > 10) score += 4;

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

async function generateSearchSuggestions(supabase: any, searchTerm: string, orgId: string): Promise<string[]> {
  const suggestions: Set<string> = new Set();
  const term = searchTerm.toLowerCase();

  try {
    const { data: nameMatches } = await supabase
      .from('customers')
      .select('name')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .ilike('name', `${term}%`)
      .limit(5);

    nameMatches?.forEach((customer: any) => {
      if (customer.name && customer.name.toLowerCase() !== term) {
        suggestions.add(customer.name);
      }
    });

    const { data: emailMatches } = await supabase
      .from('customers')
      .select('email')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .ilike('email', `${term}%`)
      .limit(3);

    emailMatches?.forEach((customer: any) => {
      if (customer.email && customer.email.toLowerCase() !== term) {
        suggestions.add(customer.email);
      }
    });

    const { data: codeMatches } = await supabase
      .from('customers')
      .select('customer_code')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
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
    const { count: totalMatches } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);

    const [
      { count: nameMatches },
      { count: emailMatches },
      { count: codeMatches },
      { count: phoneMatches }
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null).ilike('name', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null).ilike('email', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null).ilike('customer_code', `%${searchTerm}%`),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null).ilike('phone', `%${searchTerm}%`)
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

function getValueLevel(totalSpent: number): 'low' | 'medium' | 'high' | 'premium' {
  if (totalSpent > 50000) return 'premium';
  if (totalSpent > 10000) return 'high';
  if (totalSpent > 2000) return 'medium';
  return 'low';
}
