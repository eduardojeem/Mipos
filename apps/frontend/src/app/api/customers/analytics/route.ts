import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer Analytics API - Phase 5 Optimization
 * 
 * Provides advanced customer analytics including segmentation, trends, and insights.
 * Optimized for CRM dashboard with server-side calculations.
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'Organization header missing' }, { status: 400 });
    }

    const period = searchParams.get('period') || '30'; // days
    const includeSegmentation = searchParams.get('segmentation') === 'true';
    const includeTrends = searchParams.get('trends') === 'true';

    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get customer data with purchase metrics
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        created_at
      `)
      .eq('organization_id', orgId);

    if (!customers) {
      throw new Error('Failed to fetch customer data');
    }

    // Calculate basic analytics
    const analytics = {
      overview: calculateOverviewMetrics(customers),
      ...(includeSegmentation && { segmentation: calculateSegmentation(customers) }),
      ...(includeTrends && { trends: await calculateTrends(supabase, periodDays, orgId) }),
      riskAnalysis: calculateRiskAnalysis(customers),
      valueAnalysis: calculateValueAnalysis(customers),
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch customer analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculateOverviewMetrics(customers: any[]) {
  const total = customers.length;
  const active = customers.filter(c => c.is_active).length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);

  return {
    totalCustomers: total,
    activeCustomers: active,
    inactiveCustomers: total - active,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
    avgCustomerValue: total > 0 ? Math.round((totalRevenue / total) * 100) / 100 : 0,
    activeRate: total > 0 ? Math.round((active / total) * 100 * 100) / 100 : 0
  };
}

function calculateSegmentation(customers: any[]) {
  const segments = {
    new: 0,
    regular: 0,
    frequent: 0,
    vip: 0,
    at_risk: 0,
    dormant: 0
  };

  const now = Date.now();

  customers.forEach(customer => {
    const totalOrders = customer.total_orders || 0;
    const totalSpent = customer.total_purchases || 0;
    const daysSinceLastPurchase = customer.last_purchase
      ? Math.floor((now - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Determine segment
    if (daysSinceLastPurchase > 180) {
      segments.dormant++;
    } else if (daysSinceLastPurchase > 90 && totalOrders > 5) {
      segments.at_risk++;
    } else if (totalOrders <= 2) {
      segments.new++;
    } else if (totalOrders >= 25 || totalSpent > 50000) {
      segments.vip++;
    } else if (totalOrders >= 11) {
      segments.frequent++;
    } else {
      segments.regular++;
    }
  });

  // Calculate percentages
  const total = customers.length;
  const segmentationWithPercentages = Object.entries(segments).reduce((acc, [key, value]) => {
    acc[key] = {
      count: value,
      percentage: total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0
    };
    return acc;
  }, {} as Record<string, { count: number; percentage: number }>);

  return segmentationWithPercentages;
}

async function calculateTrends(supabase: any, periodDays: number, orgId: string) {
  const intervals = Math.min(periodDays, 30); // Max 30 data points
  const intervalDays = Math.ceil(periodDays / intervals);
  
  const trends = [];
  
  for (let i = 0; i < intervals; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (i * intervalDays));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - intervalDays);

    // Get new customers in this interval
    const { count: newCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    // Get sales data for this interval
    const { data: salesData } = await supabase
      .from('sales')
      .select('total, customer_id')
      .eq('organization_id', orgId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    const revenue = salesData?.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) || 0;
    const uniqueCustomers = new Set(salesData?.map((sale: any) => sale.customer_id) || []).size;

    trends.unshift({
      date: startDate.toISOString().split('T')[0],
      newCustomers: newCustomers || 0,
      revenue: Math.round(revenue * 100) / 100,
      activeCustomers: uniqueCustomers,
      avgOrderValue: salesData?.length ? Math.round((revenue / salesData.length) * 100) / 100 : 0
    });
  }

  return trends;
}

function calculateRiskAnalysis(customers: any[]) {
  const riskLevels = { low: 0, medium: 0, high: 0 };
  const atRiskCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    daysSinceLastPurchase: number;
    riskScore: number;
  }> = [];
  const now = Date.now();

  customers.forEach(customer => {
    const daysSinceLastPurchase = customer.last_purchase
      ? Math.floor((now - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const totalOrders = customer.total_orders || 0;
    let riskScore = 0;

    // Calculate risk score
    if (daysSinceLastPurchase > 180) riskScore += 50;
    else if (daysSinceLastPurchase > 90) riskScore += 30;
    else if (daysSinceLastPurchase > 30) riskScore += 15;

    if (totalOrders < 3) riskScore += 20;
    else if (totalOrders < 10) riskScore += 10;

    // Categorize risk
    if (riskScore > 70) {
      riskLevels.high++;
      if (customer.total_purchases > 1000) { // High-value at-risk customers
        atRiskCustomers.push({
          id: customer.id,
          name: customer.name,
          totalSpent: customer.total_purchases || 0,
          daysSinceLastPurchase,
          riskScore: Math.min(riskScore, 100)
        });
      }
    } else if (riskScore > 40) {
      riskLevels.medium++;
    } else {
      riskLevels.low++;
    }
  });

  return {
    riskDistribution: riskLevels,
    highValueAtRisk: atRiskCustomers.slice(0, 10), // Top 10 at-risk high-value customers
    totalAtRisk: riskLevels.high + riskLevels.medium,
    riskPercentage: customers.length > 0 
      ? Math.round(((riskLevels.high + riskLevels.medium) / customers.length) * 100 * 100) / 100 
      : 0
  };
}

function calculateValueAnalysis(customers: any[]) {
  const sortedByValue = customers
    .filter(c => c.total_purchases > 0)
    .sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0));

  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0);
  
  // Top 20% customers (Pareto principle)
  const top20PercentCount = Math.ceil(sortedByValue.length * 0.2);
  const top20Percent = sortedByValue.slice(0, top20PercentCount);
  const top20Revenue = top20Percent.reduce((sum, c) => sum + (c.total_purchases || 0), 0);

  // Customer lifetime value distribution
  const clvDistribution = { low: 0, medium: 0, high: 0 };
  
  customers.forEach(customer => {
    const clv = calculateCustomerLifetimeValue(customer);
    if (clv > 10000) clvDistribution.high++;
    else if (clv > 2000) clvDistribution.medium++;
    else clvDistribution.low++;
  });

  return {
    topCustomers: top20Percent.slice(0, 10).map(c => ({
      id: c.id,
      name: c.name,
      totalSpent: c.total_purchases || 0,
      totalOrders: c.total_orders || 0,
      avgOrderValue: (c.total_orders || 0) > 0 
        ? Math.round(((c.total_purchases || 0) / c.total_orders) * 100) / 100 
        : 0,
      lifetimeValue: calculateCustomerLifetimeValue(c)
    })),
    paretoAnalysis: {
      top20PercentRevenue: Math.round(top20Revenue * 100) / 100,
      top20PercentShare: totalRevenue > 0 
        ? Math.round((top20Revenue / totalRevenue) * 100 * 100) / 100 
        : 0,
      customerCount: top20PercentCount
    },
    clvDistribution,
    avgLifetimeValue: customers.length > 0 
      ? Math.round((customers.reduce((sum, c) => sum + calculateCustomerLifetimeValue(c), 0) / customers.length) * 100) / 100
      : 0
  };
}

function calculateCustomerLifetimeValue(customer: any): number {
  const totalOrders = customer.total_orders || 0;
  if (totalOrders === 0) return 0;

  const avgOrderValue = (customer.total_purchases || 0) / totalOrders;
  const daysSinceFirstPurchase = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const purchaseFrequency = daysSinceFirstPurchase > 0 ? totalOrders / (daysSinceFirstPurchase / 30) : 0;

  const profitMargin = 0.3; // 30% estimated margin
  const expectedLifetime = 24; // 24 months expected

  return Math.round(avgOrderValue * purchaseFrequency * profitMargin * expectedLifetime * 100) / 100;
}