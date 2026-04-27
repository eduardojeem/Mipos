import { NextRequest, NextResponse } from 'next/server'
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'
import { createAdminClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

type PaymentMethodRow = {
  id: string
  organization_id: string
  provider: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
  is_default: boolean
  updated_at: string | null
}

function normalizeLast4(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (digits.length >= 4) return digits.slice(-4)
  return null
}

function parseIntSafe(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(String(value || ''))
  if (!Number.isFinite(n)) return null
  const asInt = Math.trunc(n)
  return asInt > 0 ? asInt : null
}

export async function GET(request: NextRequest) {
  const requestedCompanyId =
    request.headers.get('x-organization-id') ||
    new URL(request.url).searchParams.get('organizationId') ||
    undefined

  const access = await requireCompanyAccess(request, {
    companyId: requestedCompanyId,
    feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  })

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status })
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'No hay empresa seleccionada' }, { status: 400 })
  }

  if (isMockAuthEnabled()) {
    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: 'mock-pm',
        provider: 'mock',
        brand: 'VISA',
        last4: '4242',
        exp_month: 12,
        exp_year: new Date().getFullYear() + 2,
      },
    })
  }

  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('payment_methods')
      .select('id,organization_id,provider,brand,last4,exp_month,exp_year,is_default,updated_at')
      .eq('organization_id', access.context.companyId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: true, paymentMethod: null })
    }

    const row = data as PaymentMethodRow
    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: row.id,
        provider: row.provider,
        brand: row.brand,
        last4: row.last4,
        exp_month: row.exp_month,
        exp_year: row.exp_year,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const requestedCompanyId =
    request.headers.get('x-organization-id') ||
    body.organizationId ||
    undefined

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

  const last4 = normalizeLast4(body.last4) || normalizeLast4(body.payment_method_token) || '0000'
  const expMonth = parseIntSafe(body.exp_month)
  const expYear = parseIntSafe(body.exp_year)
  const brand = typeof body.brand === 'string' ? body.brand.trim().slice(0, 24) : null
  const provider = typeof body.provider === 'string' ? body.provider.trim().slice(0, 24) : 'mock'

  if (expMonth !== null && (expMonth < 1 || expMonth > 12)) {
    return NextResponse.json({ error: 'Mes de expiración inválido' }, { status: 400 })
  }

  if (expYear !== null && expYear < new Date().getFullYear()) {
    return NextResponse.json({ error: 'Año de expiración inválido' }, { status: 400 })
  }

  try {
    const admin = await createAdminClient()
    const now = new Date().toISOString()
    const organizationId = access.context.companyId

    await admin
      .from('payment_methods')
      .update({ is_default: false, updated_at: now })
      .eq('organization_id', organizationId)

    const { data, error } = await admin
      .from('payment_methods')
      .insert({
        organization_id: organizationId,
        provider,
        brand,
        last4,
        exp_month: expMonth,
        exp_year: expYear,
        is_default: true,
        updated_at: now,
      })
      .select('id,provider,brand,last4,exp_month,exp_year')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: (data as any).id,
        provider: (data as any).provider,
        brand: (data as any).brand,
        last4: (data as any).last4,
        exp_month: (data as any).exp_month,
        exp_year: (data as any).exp_year,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
