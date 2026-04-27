import { NextRequest, NextResponse } from 'next/server'
import {
  COMPANY_FEATURE_KEYS,
  COMPANY_PERMISSIONS,
  requireCompanyAccess,
} from '@/app/api/_utils/company-authorization'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/app/api/admin/_utils/audit'
import { getSubscriptionSnapshot } from '@/app/api/subscription/_lib'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const requestedCompanyId = request.headers.get('x-organization-id') || body.organizationId || undefined

  const access = await requireCompanyAccess(request, {
    companyId: requestedCompanyId,
    permission: COMPANY_PERMISSIONS.MANAGE_BILLING,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    allowedRoles: ['OWNER', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'No hay empresa seleccionada' }, { status: 400 })
  }

  if (body?.confirm !== true) {
    return NextResponse.json({ error: 'Confirmación requerida' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    const now = new Date().toISOString()

    const { data: sub, error: subError } = await admin
      .from('saas_subscriptions')
      .select('id,cancel_at_period_end')
      .eq('organization_id', access.context.companyId)
      .maybeSingle()

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    if (!sub?.id) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    if (sub.cancel_at_period_end === true) {
      const snapshot = await getSubscriptionSnapshot(access.context.companyId)
      return NextResponse.json({ success: true, message: 'La cancelación ya estaba programada', snapshot })
    }

    const { error: updateError } = await admin
      .from('saas_subscriptions')
      .update({ cancel_at_period_end: true, updated_at: now })
      .eq('id', sub.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: orgRow } = await admin
      .from('organizations')
      .select('settings')
      .eq('id', access.context.companyId)
      .maybeSingle()

    const currentSettings = (orgRow as any)?.settings && typeof (orgRow as any).settings === 'object'
      ? (orgRow as any).settings
      : {}

    await admin
      .from('organizations')
      .update({
        settings: { ...currentSettings, cancelRequestedAt: now },
        updated_at: now,
      } as any)
      .eq('id', access.context.companyId)

    logAudit('subscription.cancel_requested', {
      userId: access.context.userId,
      organizationId: access.context.companyId,
      at: now,
    })

    const snapshot = await getSubscriptionSnapshot(access.context.companyId)

    return NextResponse.json({
      success: true,
      message: 'Cancelación programada. Podrás usar tu plan hasta el final del periodo actual.',
      snapshot,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
