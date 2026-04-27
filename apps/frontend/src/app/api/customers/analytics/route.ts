import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  calculateCustomerLifetimeValue,
  resolveCustomerOrganizationId,
} from '@/app/api/customers/_lib';

/**
 * Customer Analytics API - Phase 5 Optimization
 *
 * Provides advanced customer analytics including segmentation, trends, and insights.
 * Optimized for CRM dashboard with server-side calculations.
 */

type AnalyticsCustomerRow = {
  id: string;
  name: string | null;
  customer_type: string | null;
  is_active: boolean | null;
  total_purchases: number | null;
  total_orders: number | null;
  last_purchase: string | null;
  created_at: string | null;
};

type AnalyticsSaleRow = {
  total: number | null;
  customer_id: string | null;
  created_at: string | null;
};

type TrendAccumulator = {
  date: string;
  newCustomers: number;
  revenue: number;
  orderCount: number;
  activeCustomerIds: Set<string>;
};

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

    const parsedPeriod = Number.parseInt(searchParams.get('period') || '30', 10);
    const periodDays = Number.isFinite(parsedPeriod) && parsedPeriod > 0 ? Math.min(parsedPeriod, 365) : 30;
    const includeSegmentation = searchParams.get('segmentation') === 'true';
    const includeTrends = searchParams.get('trends') === 'true';
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - periodDays);

    const { data: customers, error: customersError } = await supabase
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
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (customersError) {
      throw new Error(customersError.message);
    }

    const safeCustomers = customers || [];

    let salesInPeriod: AnalyticsSaleRow[] = [];
    if (includeTrends) {
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total, customer_id, created_at')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString());

      if (salesError) {
        throw new Error(salesError.message);
      }

      salesInPeriod = sales || [];
    }

    const analytics = {
      overview: calculateOverviewMetrics(safeCustomers),
      ...(includeSegmentation && { segmentation: calculateSegmentation(safeCustomers) }),
      ...(includeTrends && { trends: calculateTrends(safeCustomers, salesInPeriod, periodDays, now) }),
      riskAnalysis: calculateRiskAnalysis(safeCustomers),
      valueAnalysis: calculateValueAnalysis(safeCustomers),
      generatedAt: now.toISOString()
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

function calculateOverviewMetrics(customers: AnalyticsCustomerRow[]) {
  const total = customers.length;
  const active = customers.filter((c) => c.is_active).length;
  const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.total_purchases) || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (Number(c.total_orders) || 0), 0);

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

function calculateSegmentation(customers: AnalyticsCustomerRow[]) {
  const segments = {
    new: 0,
    regular: 0,
    frequent: 0,
    vip: 0,
    at_risk: 0,
    dormant: 0
  };

  const now = Date.now();

  customers.forEach((customer) => {
    const totalOrders = Number(customer.total_orders) || 0;
    const totalSpent = Number(customer.total_purchases) || 0;
    const daysSinceLastPurchase = customer.last_purchase
      ? Math.floor((now - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

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

  const total = customers.length;
  return Object.entries(segments).reduce((acc, [key, value]) => {
    acc[key] = {
      count: value,
      percentage: total > 0 ? Math.round((value / total) * 100 * 100) / 100 : 0
    };
    return acc;
  }, {} as Record<string, { count: number; percentage: number }>);
}

function calculateTrends(
  customers: AnalyticsCustomerRow[],
  salesData: AnalyticsSaleRow[],
  periodDays: number,
  now: Date
) {
  const intervals = Math.min(periodDays, 30);
  const intervalDays = Math.max(1, Math.ceil(periodDays / intervals));
  const dayMs = 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();
  const periodStartMs = nowMs - periodDays * dayMs;

  const buckets: TrendAccumulator[] = Array.from({ length: intervals }, (_, index) => {
    const bucketStartMs = periodStartMs + index * intervalDays * dayMs;

    return {
      date: new Date(bucketStartMs).toISOString().split('T')[0],
      newCustomers: 0,
      revenue: 0,
      orderCount: 0,
      activeCustomerIds: new Set<string>()
    };
  });

  const bucketSpanMs = intervalDays * dayMs;

  for (const customer of customers) {
    const createdAtMs = customer.created_at ? new Date(customer.created_at).getTime() : NaN;
    if (!Number.isFinite(createdAtMs) || createdAtMs < periodStartMs || createdAtMs > nowMs) {
      continue;
    }

    const bucketIndex = Math.min(
      intervals - 1,
      Math.floor((createdAtMs - periodStartMs) / bucketSpanMs)
    );

    buckets[bucketIndex].newCustomers += 1;
  }

  for (const sale of salesData) {
    const createdAtMs = sale.created_at ? new Date(sale.created_at).getTime() : NaN;
    if (!Number.isFinite(createdAtMs) || createdAtMs < periodStartMs || createdAtMs > nowMs) {
      continue;
    }

    const bucketIndex = Math.min(
      intervals - 1,
      Math.floor((createdAtMs - periodStartMs) / bucketSpanMs)
    );
    const bucket = buckets[bucketIndex];

    bucket.revenue += Number(sale.total) || 0;
    bucket.orderCount += 1;

    if (sale.customer_id) {
      bucket.activeCustomerIds.add(sale.customer_id);
    }
  }

  return buckets.map((bucket) => ({
    date: bucket.date,
    newCustomers: bucket.newCustomers,
    revenue: Math.round(bucket.revenue * 100) / 100,
    activeCustomers: bucket.activeCustomerIds.size,
    avgOrderValue: bucket.orderCount > 0
      ? Math.round((bucket.revenue / bucket.orderCount) * 100) / 100
      : 0
  }));
}

function calculateRiskAnalysis(customers: AnalyticsCustomerRow[]) {
  const riskLevels = { low: 0, medium: 0, high: 0 };
  const atRiskCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    daysSinceLastPurchase: number;
    riskScore: number;
  }> = [];
  const now = Date.now();

  customers.forEach((customer) => {
    const daysSinceLastPurchase = customer.last_purchase
      ? Math.floor((now - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const totalOrders = Number(customer.total_orders) || 0;
    const totalPurchases = Number(customer.total_purchases) || 0;
    let riskScore = 0;

    if (daysSinceLastPurchase > 180) riskScore += 50;
    else if (daysSinceLastPurchase > 90) riskScore += 30;
    else if (daysSinceLastPurchase > 30) riskScore += 15;

    if (totalOrders < 3) riskScore += 20;
    else if (totalOrders < 10) riskScore += 10;

    if (riskScore > 70) {
      riskLevels.high++;
      if (totalPurchases > 1000) {
        atRiskCustomers.push({
          id: customer.id,
          name: customer.name || 'Cliente sin nombre',
          totalSpent: totalPurchases,
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
    highValueAtRisk: atRiskCustomers.slice(0, 10),
    totalAtRisk: riskLevels.high + riskLevels.medium,
    riskPercentage: customers.length > 0
      ? Math.round(((riskLevels.high + riskLevels.medium) / customers.length) * 100 * 100) / 100
      : 0
  };
}

function calculateValueAnalysis(customers: AnalyticsCustomerRow[]) {
  const sortedByValue = customers
    .filter((customer) => Number(customer.total_purchases) > 0)
    .sort((a, b) => (Number(b.total_purchases) || 0) - (Number(a.total_purchases) || 0));

  const totalRevenue = customers.reduce((sum, customer) => sum + (Number(customer.total_purchases) || 0), 0);

  const top20PercentCount = Math.ceil(sortedByValue.length * 0.2);
  const top20Percent = sortedByValue.slice(0, top20PercentCount);
  const top20Revenue = top20Percent.reduce((sum, customer) => sum + (Number(customer.total_purchases) || 0), 0);

  const clvDistribution = { low: 0, medium: 0, high: 0 };

  customers.forEach((customer) => {
    const clv = calculateCustomerLifetimeValue(
      Number(customer.total_purchases) || 0,
      Number(customer.total_orders) || 0,
      customer.created_at
    );
    if (clv > 10000) clvDistribution.high++;
    else if (clv > 2000) clvDistribution.medium++;
    else clvDistribution.low++;
  });

  return {
    topCustomers: top20Percent.slice(0, 10).map((customer) => ({
      id: customer.id,
      name: customer.name || 'Cliente sin nombre',
      totalSpent: Number(customer.total_purchases) || 0,
      totalOrders: Number(customer.total_orders) || 0,
      avgOrderValue: (Number(customer.total_orders) || 0) > 0
        ? Math.round((((Number(customer.total_purchases) || 0) / Number(customer.total_orders)) * 100)) / 100
        : 0,
      lifetimeValue: calculateCustomerLifetimeValue(
        Number(customer.total_purchases) || 0,
        Number(customer.total_orders) || 0,
        customer.created_at
      )
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
      ? Math.round((
        customers.reduce(
          (sum, customer) => sum + calculateCustomerLifetimeValue(
            Number(customer.total_purchases) || 0,
            Number(customer.total_orders) || 0,
            customer.created_at
          ),
          0
        ) / customers.length
      ) * 100) / 100
      : 0
  };
}
