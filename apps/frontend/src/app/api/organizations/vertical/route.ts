import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { COMPANY_PERMISSIONS, requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { getValidatedOrganizationId } from '@/lib/organization'
import { BUSINESS_VERTICALS, normalizeVertical, type BusinessVertical } from '@/config/verticals'
import { getVerticalLockStatus } from './rules'

/**
 * GET /api/organizations/vertical
 * Retorna el vertical (tipo de negocio) de la organización actual.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID requerido' }, { status: 400 })
    }

    const access = await requireCompanyAccess(request, {
      companyId: orgId,
      permission: COMPANY_PERMISSIONS.MANAGE_COMPANY,
    })
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const admin = await createAdminClient()
    const { data: org, error: orgError } = await (admin as any)
      .from('organizations')
      .select('id, vertical')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const lock = await getVerticalLockStatus(admin as any, orgId, {
      canOverride: access.context.isSuperAdmin,
    })

    return NextResponse.json({ success: true, vertical: normalizeVertical(org.vertical), lock })
  } catch (err) {
    console.error('[orgs/vertical GET]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/organizations/vertical
 * Cambia el vertical (tipo de negocio) de la organización actual.
 * Body: { vertical: 'RETAIL' | 'BARBERSHOP' }
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orgId = (await getValidatedOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID requerido' }, { status: 400 })
    }

    const access = await requireCompanyAccess(request, {
      companyId: orgId,
      permission: COMPANY_PERMISSIONS.MANAGE_COMPANY,
    })
    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const body = await request.json().catch(() => ({}))
    const requested = typeof body?.vertical === 'string' ? body.vertical.toUpperCase() : ''

    if (!(BUSINESS_VERTICALS as readonly string[]).includes(requested)) {
      return NextResponse.json(
        { error: `Vertical inválido. Valores permitidos: ${BUSINESS_VERTICALS.join(', ')}` },
        { status: 400 },
      )
    }

    const newVertical = requested as BusinessVertical
    const admin = await createAdminClient()
    const { data: currentOrg, error: currentOrgError } = await (admin as any)
      .from('organizations')
      .select('id, vertical')
      .eq('id', orgId)
      .single()

    if (currentOrgError || !currentOrg) {
      return NextResponse.json({ error: 'Organizacion no encontrada' }, { status: 404 })
    }

    const currentVertical = normalizeVertical(currentOrg.vertical)
    const lock = await getVerticalLockStatus(admin as any, orgId, {
      canOverride: access.context.isSuperAdmin,
    })

    if (currentVertical === newVertical) {
      return NextResponse.json({ success: true, vertical: currentVertical, lock })
    }

    if (lock.locked && !lock.canChange) {
      return NextResponse.json(
        {
          error: 'El tipo de negocio ya no se puede cambiar porque la empresa tiene datos operativos.',
          code: 'VERTICAL_LOCKED',
          lock,
        },
        { status: 409 },
      )
    }

    const { data, error } = await (admin as any)
      .from('organizations')
      .update({ vertical: newVertical })
      .eq('id', orgId)
      .select('id, vertical')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, vertical: normalizeVertical(data?.vertical), lock })
  } catch (err) {
    console.error('[orgs/vertical PUT]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
