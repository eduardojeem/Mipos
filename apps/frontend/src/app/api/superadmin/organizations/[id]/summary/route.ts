import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getSubscriptionSnapshot } from '@/app/api/subscription/_lib'

function normalizeStatus(raw: string | null | undefined) {
  const value = String(raw || '').toLowerCase()
  if (value === 'active') return 'active'
  if (value === 'trialing') return 'trialing'
  if (value === 'past_due') return 'past_due'
  if (value === 'suspended') return 'suspended'
  if (value === 'cancelled' || value === 'canceled') return 'canceled'
  return 'unknown'
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertSuperAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  try {
    const { id } = await params
    const admin = await createAdminClient()

    const { data: org, error } = await admin
      .from('organizations')
      .select('id,name,slug,created_at,subscription_plan,subscription_status')
      .eq('id', id)
      .single()

    if (error || !org) {
      return NextResponse.json({ error: error?.message || 'Organización no encontrada' }, { status: 404 })
    }

    const snapshot = await getSubscriptionSnapshot(id).catch(() => null)
    const status = normalizeStatus(snapshot?.subscriptionStatus || org.subscription_status)

    return NextResponse.json({
      success: true,
      data: {
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.created_at,
        subscription: snapshot
          ? {
              planId: snapshot.plan.id,
              planName: snapshot.plan.name,
              planSlug: snapshot.plan.slug,
              status,
              billingCycle: snapshot.billingCycle,
              currentPeriodStart: snapshot.currentPeriodStart,
              currentPeriodEnd: snapshot.currentPeriodEnd,
              cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
            }
          : {
              planId: String(org.subscription_plan || 'free'),
              planName: String(org.subscription_plan || 'free'),
              planSlug: String(org.subscription_plan || 'free'),
              status,
              billingCycle: 'monthly' as const,
              currentPeriodStart: null,
              currentPeriodEnd: null,
              cancelAtPeriodEnd: false,
            },
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 })
  }
}

