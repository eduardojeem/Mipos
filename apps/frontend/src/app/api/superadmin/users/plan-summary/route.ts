'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: roleRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((roleRow?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Count Auth users via Admin API (iterate pages)
    let totalAuthUsers = 0
    try {
      const admin = createAdminClient()
      let page = 1
      const perPage = 200
      while (true) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage })
        const batch = data?.users || []
        totalAuthUsers += batch.length
        if (batch.length < perPage) break
        page += 1
      }
    } catch (e: unknown) {
      // If admin client not configured, fallback to users table count
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
      totalAuthUsers = count || 0
    }

    // Get subscriptions with plan info
    const { data: subscriptions, error: subErr } = await supabase
      .from('saas_subscriptions')
      .select('organization_id, status, billing_cycle, saas_plans(name, slug)')

    if (subErr && subErr.code !== '42P01') {
      return NextResponse.json({ error: subErr.message }, { status: 500 })
    }

    const subs = Array.isArray(subscriptions) ? subscriptions : []
    const orgPlanMap = new Map<string, { name: string; slug: string; status: string | null; billing_cycle: string | null }>()
    subs.forEach((s: { organization_id: unknown; saas_plans: { name: string; slug: string } | null; status: string | null; billing_cycle: string | null }) => {
      const orgId = String(s.organization_id)
      const planName = s?.saas_plans?.name || 'UNKNOWN'
      const planSlug = s?.saas_plans?.slug || 'unknown'
      const status = s?.status || null
      const cycle = s?.billing_cycle || null
      orgPlanMap.set(orgId, { name: planName, slug: planSlug, status, billing_cycle: cycle })
    })

    // Collect organizations from subscriptions
    const orgIds = Array.from(orgPlanMap.keys())

    // Count members per organization, aggregate by plan
    const planAgg = new Map<string, { name: string; organizations: number; users: number; monthly: number; yearly: number }>()

    for (const orgId of orgIds) {
      const { count: membersCount } = await supabase
        .from('organization_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const planInfo = orgPlanMap.get(orgId)!
      const key = planInfo.slug || 'unknown'
      const entry = planAgg.get(key) || { name: planInfo.name || key, organizations: 0, users: 0, monthly: 0, yearly: 0 }
      entry.organizations += 1
      entry.users += membersCount || 0
      const cycle = String(planInfo.billing_cycle || '').toLowerCase()
      if (cycle === 'yearly') entry.yearly += 1
      else entry.monthly += 1
      planAgg.set(key, entry)
    }

    // Organizations without subscription (optional)
    const { data: allMembers } = await supabase
      .from('organization_members')
      .select('organization_id')

    const allOrgIds: string[] = Array.from(
      new Set(
        (allMembers || []).map(
          (m: { organization_id: string | number | null }) => String(m.organization_id ?? '')
        )
      )
    )
    const withoutSub = allOrgIds.filter((id) => !orgPlanMap.has(id))

    return NextResponse.json({
      success: true,
      totalAuthUsers,
      plans: Array.from(planAgg.values()),
      organizationsWithoutSubscription: withoutSub,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
