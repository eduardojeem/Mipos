import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { structuredLogger } from '@/lib/logger'
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'

const COMPONENT = 'AdminOrganizationAPI'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await requireCompanyAccess(request, {
      companyId: id,
      permission: COMPANY_PERMISSIONS.MANAGE_COMPANY,
      feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
      allowedRoles: ['OWNER', 'ADMIN'],
    })

    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const canUseCustomBranding =
      access.context.isSuperAdmin || access.context.features.includes(COMPANY_FEATURE_KEYS.CUSTOM_BRANDING)

    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {}

    for (const field of ['subdomain', 'custom_domain']) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if ('subdomain' in updates) {
      const subdomain = String(updates.subdomain || '').trim().toLowerCase()
      if (!subdomain) {
        return NextResponse.json({ error: 'El subdominio es requerido' }, { status: 400 })
      }

      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
      if (!subdomainRegex.test(subdomain)) {
        return NextResponse.json(
          { error: 'Formato de subdominio invalido. Usa minusculas, numeros y guiones.' },
          { status: 400 }
        )
      }

      let existing: { id: string } | null = null
      try {
        const result = await adminClient
          .from('organizations')
          .select('id')
          .eq('subdomain', subdomain)
          .neq('id', id)
          .maybeSingle()
        existing = result.data
      } catch {}

      if (existing) {
        return NextResponse.json({ error: 'Este subdominio ya esta en uso' }, { status: 409 })
      }

      updates.subdomain = subdomain
    }

    if ('custom_domain' in updates) {
      const customDomain = String(updates.custom_domain || '').trim().toLowerCase()

      if (!customDomain) {
        updates.custom_domain = null
      } else {
        if (!canUseCustomBranding) {
          return NextResponse.json(
            { error: 'El dominio personalizado requiere plan Professional' },
            { status: 403 }
          )
        }

        const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/
        if (!domainRegex.test(customDomain)) {
          return NextResponse.json({ error: 'Formato de dominio invalido' }, { status: 400 })
        }

        let existing: { id: string } | null = null
        try {
          const result = await adminClient
            .from('organizations')
            .select('id')
            .eq('custom_domain', customDomain)
            .neq('id', id)
            .maybeSingle()
          existing = result.data
        } catch {}

        if (existing) {
          return NextResponse.json({ error: 'Este dominio ya esta en uso' }, { status: 409 })
        }

        updates.custom_domain = customDomain
      }
    }

    let data: unknown
    let error: any

    try {
      const result = await adminClient
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      data = result.data
      error = result.error
    } catch (caught) {
      error = caught
    }

    if (error && (String(error?.message || '').toLowerCase().includes('column') || String(error?.message || '').toLowerCase().includes('does not exist'))) {
      if (typeof updates.subdomain === 'string' && updates.subdomain.trim().length > 0) {
        const fallback = await adminClient
          .from('organizations')
          .update({
            slug: updates.subdomain,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        data = fallback.data
        error = fallback.error
      }
    }

    if (error) {
      structuredLogger.error('Error updating organization', error as Error, {
        component: COMPONENT,
        action: 'PATCH',
        metadata: { id, userId: user.id },
      })
      return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }

    structuredLogger.info('Organization updated successfully', {
      component: COMPONENT,
      action: 'PATCH',
      metadata: { id, userId: user.id, updates: Object.keys(updates) },
    })

    return NextResponse.json({ success: true, organization: data })
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization', error as Error, {
      component: COMPONENT,
      action: 'PATCH',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
