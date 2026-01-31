import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const organizationId = String(body.organizationId || '').trim()
    const planSlug = String(body.planSlug || '').toLowerCase().trim()
    const billingCycleRaw = String(body.billingCycle || 'monthly').toLowerCase().trim()
    const billingCycle = billingCycleRaw === 'yearly' ? 'yearly' : 'monthly'
    if (!organizationId || !planSlug) return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })

    const { data: plan, error: planErr } = await supabase
      .from('saas_plans')
      .select('id, slug')
      .eq('slug', planSlug)
      .single()
    if (planErr || !plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

    const { data: existing } = await supabase
      .from('saas_subscriptions')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from('saas_subscriptions')
        .update({ plan_id: plan.id, status: 'ACTIVE', billing_cycle: billingCycle, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
      return NextResponse.json({ success: true, action: 'updated' })
    } else {
      const { error: insErr } = await supabase
        .from('saas_subscriptions')
        .insert({ organization_id: organizationId, plan_id: plan.id, status: 'ACTIVE', billing_cycle: billingCycle })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      return NextResponse.json({ success: true, action: 'created' })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
