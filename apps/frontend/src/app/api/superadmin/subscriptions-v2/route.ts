import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { normalizePlanCode } from '@/lib/plan-catalog';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused' | 'unknown';

type SubscriptionRow = {
  id?: unknown;
  organization_id?: unknown;
  plan_id?: unknown;
  status?: unknown;
  billing_cycle?: unknown;
  current_period_start?: unknown;
  current_period_end?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  organizations?: unknown;
  saas_plans?: unknown;
};

type PlanSubscriptionRow = {
  company_id?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  is_active?: unknown;
};

const statusBuckets: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'canceled', 'paused'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  return null;
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeStatus(value: unknown): SubscriptionStatus {
  const status = asText(value, 'unknown').toLowerCase() as SubscriptionStatus;
  return statusBuckets.includes(status) ? status : 'unknown';
}

function normalizeCycle(value: unknown) {
  const cycle = asText(value, 'monthly').toLowerCase();
  return cycle === 'yearly' || cycle === 'annual' ? 'yearly' : 'monthly';
}

function buildSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'unknown';
}

function monthlyAmount(plan: Record<string, unknown> | null, cycle: string) {
  const monthly = asNumber(plan?.price_monthly);
  const yearly = asNumber(plan?.price_yearly);
  return cycle === 'yearly' ? yearly / 12 : monthly;
}

function getPlanMapKey(value: unknown) {
  const text = asText(value);
  return text ? normalizePlanCode(text) : '';
}

function daysUntil(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatSubscription(
  sub: SubscriptionRow,
  planSubs: PlanSubscriptionRow[],
  plansByCode: Map<string, Record<string, unknown>>
) {
  const organization = asRecord(sub.organizations);
  const plan = asRecord(sub.saas_plans);
  const organizationPlan = plansByCode.get(getPlanMapKey(organization?.subscription_plan));
  const effectivePlan = organizationPlan || plan;
  const organizationId = asText(sub.organization_id, asText(organization?.id));
  const planId = asText(effectivePlan?.id, asText(sub.plan_id, asText(plan?.id)));
  const organizationName = asText(organization?.name, 'Organizacion sin nombre');
  const cycle = normalizeCycle(sub.billing_cycle);
  const period = planSubs.find((planSub) => asText(planSub.company_id) === organizationId && planSub.is_active === true);
  const currentPeriodStart = asText(sub.current_period_start, asText(period?.start_date));
  const currentPeriodEnd = asText(sub.current_period_end, asText(period?.end_date));
  const status = normalizeStatus(sub.status);
  const amount = monthlyAmount(effectivePlan, cycle);

  return {
    id: asText(sub.id),
    organizationId,
    organizationName,
    organizationSlug: buildSlug(organizationName),
    planId,
    planName: asText(effectivePlan?.name, 'Plan personalizado'),
    planPrice: cycle === 'yearly' ? asNumber(effectivePlan?.price_yearly) : asNumber(effectivePlan?.price_monthly),
    monthlyAmount: amount,
    planInterval: cycle,
    status,
    cancelAtPeriodEnd: false,
    currentPeriodStart,
    currentPeriodEnd,
    daysUntilRenewal: currentPeriodEnd ? daysUntil(currentPeriodEnd) : null,
    createdAt: asText(sub.created_at),
    updatedAt: asText(sub.updated_at)
  };
}

function emptyResponse(page: number, limit: number) {
  return NextResponse.json({
    success: true,
    data: [],
    summary: {
      total: 0,
      active: 0,
      trialing: 0,
      pastDue: 0,
      canceled: 0,
      paused: 0,
      mrr: 0
    },
    pagination: { total: 0, page, limit, pages: 0 }
  });
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim();
    const skip = (page - 1) * limit;

    const supabaseAdmin = await createAdminClient();
    let searchOrgIds: string[] = [];
    let searchPlanIds: string[] = [];

    if (search) {
      const searchPattern = `%${search}%`;
      const [{ data: orgMatches }, { data: planMatches }] = await Promise.all([
        supabaseAdmin.from('organizations').select('id').ilike('name', searchPattern).limit(200),
        supabaseAdmin.from('saas_plans').select('id').ilike('name', searchPattern).limit(200)
      ]);

      searchOrgIds = (orgMatches || []).map((row: { id: string }) => row.id).filter(Boolean);
      searchPlanIds = (planMatches || []).map((row: { id: string }) => row.id).filter(Boolean);

      if (searchOrgIds.length === 0 && searchPlanIds.length === 0) {
        return emptyResponse(page, limit);
      }
    }

    const selectFields = `
      id,
      organization_id,
      plan_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end,
      created_at,
      updated_at,
      organizations ( id, name, subscription_plan ),
      saas_plans ( id, name, price_monthly, price_yearly )
    `;

    let query = supabaseAdmin
      .from('saas_subscriptions')
      .select(selectFields, { count: 'exact' });

    let summaryQuery = supabaseAdmin
      .from('saas_subscriptions')
      .select(selectFields);

    if (statusFilter && statusFilter !== 'all') {
      query = query.ilike('status', statusFilter);
    }

    if (search) {
      const filters = [
        searchOrgIds.length > 0 ? `organization_id.in.(${searchOrgIds.join(',')})` : '',
        searchPlanIds.length > 0 ? `plan_id.in.(${searchPlanIds.join(',')})` : ''
      ].filter(Boolean);

      query = query.or(filters.join(','));
      summaryQuery = summaryQuery.or(filters.join(','));
    }

    query = query.range(skip, skip + limit - 1).order('created_at', { ascending: false });
    summaryQuery = summaryQuery.limit(5000);

    const [{ data: subscriptions, count, error }, { data: summaryRows }, { data: planSubs }, { data: plans }] = await Promise.all([
      query,
      summaryQuery,
      supabaseAdmin.from('plan_subscriptions').select('company_id, start_date, end_date, is_active'),
      supabaseAdmin.from('saas_plans').select('id, slug, name, price_monthly, price_yearly')
    ]);

    if (error) {
      if (error.code === '42P01') {
        return emptyResponse(page, limit);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const periods = (planSubs || []) as PlanSubscriptionRow[];
    const plansByCode = new Map<string, Record<string, unknown>>();
    for (const plan of (plans || []) as Record<string, unknown>[]) {
      const code = getPlanMapKey(plan.slug);
      if (!code) continue;

      const slugIsCanonicalCode = asText(plan.slug).toUpperCase() === code;
      if (!plansByCode.has(code) || slugIsCanonicalCode) {
        plansByCode.set(code, plan);
      }
    }
    const formattedData = ((subscriptions || []) as SubscriptionRow[]).map((sub) => formatSubscription(sub, periods, plansByCode));
    const formattedSummaryRows = ((summaryRows || []) as SubscriptionRow[]).map((sub) => formatSubscription(sub, periods, plansByCode));

    const summary = formattedSummaryRows.reduce(
      (acc, sub) => {
        acc.total += 1;
        if (sub.status === 'active') acc.active += 1;
        if (sub.status === 'trialing') acc.trialing += 1;
        if (sub.status === 'past_due') acc.pastDue += 1;
        if (sub.status === 'canceled') acc.canceled += 1;
        if (sub.status === 'paused') acc.paused += 1;
        if (sub.status === 'active' || sub.status === 'trialing') acc.mrr += sub.monthlyAmount;
        return acc;
      },
      { total: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0, paused: 0, mrr: 0 }
    );

    return NextResponse.json(
      {
        success: true,
        data: formattedData,
        summary,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
