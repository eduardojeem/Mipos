import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

function addBillingPeriod(startAt: Date, billingCycle: string | null | undefined) {
  const endAt = new Date(startAt);
  if (String(billingCycle || '').toLowerCase() === 'yearly') {
    endAt.setFullYear(endAt.getFullYear() + 1);
  } else {
    endAt.setMonth(endAt.getMonth() + 1);
  }
  return endAt;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // In Next.js 15, params is a Promise
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const supabaseAdmin = await createAdminClient();

    // 1. Get saas_subscription details
    const { data: saasSub, error: saasErr } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('organization_id, plan_id, billing_cycle')
      .eq('id', id)
      .single();

    if (saasErr || !saasSub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const now = new Date();
    const periodEnd = addBillingPeriod(now, saasSub.billing_cycle);
    const nowIso = now.toISOString();
    const periodEndIso = periodEnd.toISOString();
    const startDate = nowIso.split('T')[0];
    const endDate = periodEndIso.split('T')[0];
    const { data: plan } = saasSub.plan_id
      ? await supabaseAdmin
          .from('saas_plans')
          .select('slug')
          .eq('id', saasSub.plan_id)
          .maybeSingle()
      : { data: null };
    const planSlug = typeof plan?.slug === 'string' ? plan.slug : 'free';

    // 2. Reactivate on saas_subscriptions and create a fresh billing period.
    await supabaseAdmin
      .from('saas_subscriptions')
      .update({
        status: 'ACTIVE',
        current_period_start: nowIso,
        current_period_end: periodEndIso,
        updated_at: nowIso,
      })
      .eq('id', id);

    await supabaseAdmin
      .from('organizations')
      .update({ subscription_status: 'ACTIVE', updated_at: nowIso })
      .eq('id', saasSub.organization_id);

    // 3. Reactivate plan_subscriptions with the same renewed period.
    await supabaseAdmin
      .from('plan_subscriptions')
      .upsert({
        company_id: saasSub.organization_id,
        plan_type: planSlug,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      }, { onConflict: 'company_id' });

    return NextResponse.json({
       success: true,
       message: 'Subscription reactivated successfully'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
