import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { normalizePlanSlug } from '@/lib/plan-catalog'
import { getPlanRecord, syncOrganizationSubscriptionState } from '@/app/api/subscription/_lib'

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

    const { data: organization, error: organizationErr } = await supabaseAdmin
      .from('organizations')
      .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at')
      .eq('id', organizationId)
      .single()

    if (organizationErr || !organization) {
      return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
    }

    const plan = await getPlanRecord(planSlug)
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    await syncOrganizationSubscriptionState({
      organization,
      plan,
      billingCycle,
    })

    return NextResponse.json({ success: true, action: 'synchronized' })
    
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
