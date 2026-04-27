import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { getCanonicalPlanAliases, normalizePlanSlug } from '@/lib/plan-catalog'

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabaseAdmin = await createAdminClient();

    const body = await request.json()
    const organizationId = String(body.organizationId || '').trim()
    const planSlug = normalizePlanSlug(String(body.planSlug || '').toLowerCase().trim())
    const billingCycleRaw = String(body.billingCycle || 'monthly').toLowerCase().trim()
    const billingCycle = billingCycleRaw === 'yearly' ? 'yearly' : 'monthly'

    if (!organizationId || !planSlug) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const { data: matchingPlans, error: planErr } = await supabaseAdmin
      .from('saas_plans')
      .select('id, slug, max_users, max_products, max_locations')
      .in('slug', getCanonicalPlanAliases(planSlug))

    const aliases = getCanonicalPlanAliases(planSlug)
    const plan = (matchingPlans || []).sort((a: any, b: any) => aliases.indexOf(a.slug) - aliases.indexOf(b.slug))[0] as any

    if (planErr || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const { data: existing } = await supabaseAdmin
      .from('saas_subscriptions')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existing?.id) {
      const { error: updErr } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
          plan_id: plan.id,
          status: 'ACTIVE',
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }
    } else {
      const { error: insErr } = await supabaseAdmin
        .from('saas_subscriptions')
        .insert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: 'ACTIVE',
          billing_cycle: billingCycle,
        })

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
    }

    // Now synchronize the actual backend restrictions logic (`plan_subscriptions` & `usage_limits`)
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Upsert plan_subscriptions
    const { data: planSub, error: planSubErr } = await supabaseAdmin
      .from('plan_subscriptions')
      .upsert({
        company_id: organizationId,
        plan_type: planSlug,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        is_active: true
      }, { onConflict: 'company_id' })
      .select()
      .single();

    if (planSubErr || !planSub) {
        console.error("Error upserting plan_subscriptions:", planSubErr);
        return NextResponse.json({ error: planSubErr?.message || 'Error creating subscription limits' }, { status: 500 })
    }

    // Refresh usage_limits to 999999 for all supported features when granting Premium/Pro
    const isProfessional = planSlug === 'professional';
    const isStarter = planSlug === 'starter';
    const limitValue = isProfessional ? 999999 : isStarter ? 1000 : 0; 
    
    // Feature usage limit creation
    const predefinedFeatures = ['users', 'products', 'sales', 'storage'];
    
    for (const feature of predefinedFeatures) {
       await supabaseAdmin.from('usage_limits').upsert({
          subscription_id: planSub.id,
          feature_type: feature,
          limit_value: limitValue,
          current_usage: 0,
          period: 'monthly'
       }, { onConflict: 'subscription_id,feature_type' });
    }

    return NextResponse.json({ success: true, action: 'synchronized' })
    
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
