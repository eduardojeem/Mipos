import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusFilter = searchParams.get('status');
    const skip = (page - 1) * limit;

    const supabaseAdmin = await createAdminClient();

    let query = supabaseAdmin
      .from('saas_subscriptions')
      .select(`
        id,
        status,
        billing_cycle,
        created_at,
        updated_at,
        organizations ( id, name ),
        saas_plans ( id, name, price_monthly, price_yearly )
      `, { count: 'exact' });

    if (statusFilter && statusFilter !== 'all') {
       query = query.eq('status', statusFilter.toUpperCase());
    }

    // Pagination
    query = query.range(skip, skip + limit - 1).order('created_at', { ascending: false });

    const { data: subscriptions, count, error } = await query;

    if (error) {
      // Return empty if table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit, pages: 0 } });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: planSubs } = await supabaseAdmin.from('plan_subscriptions').select('company_id, start_date, end_date, is_active');

    const formattedData = (subscriptions || []).map((sub: Record<string, any>) => {
      // Link to plan_subscriptions logic to get actual period dates
      const activePlanSub = (planSubs || []).find((ps: Record<string, any>) => ps.company_id === sub.organizations?.id && ps.is_active);

      return {
        id: sub.id,
        organizationId: sub.organizations?.id,
        organizationName: sub.organizations?.name || 'Unknown Organization',
        organizationSlug: sub.organizations?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        planName: sub.saas_plans?.name || 'Custom Plan',
        planPrice: sub.billing_cycle === 'yearly' ? sub.saas_plans?.price_yearly : sub.saas_plans?.price_monthly,
        planInterval: sub.billing_cycle || 'monthly',
        status: sub.status?.toLowerCase() || 'unknown',
        cancelAtPeriodEnd: false, // Not natively mapped in basic saas_subscriptions but supported
        currentPeriodStart: activePlanSub?.start_date || sub.created_at,
        currentPeriodEnd: activePlanSub?.end_date || sub.updated_at,
        createdAt: sub.created_at
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
