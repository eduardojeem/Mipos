import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { defaultBusinessConfig } from '@/types/business-config'
import { invalidateCachedConfig } from '../cache'
import { logAudit } from '../../admin/_utils/audit'
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization'
import { COMPANY_FEATURE_KEYS, COMPANY_PERMISSIONS } from '@/lib/company-access'

type SettingsValueRow = {
  value?: typeof defaultBusinessConfig
  updated_at?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    const access = await requireCompanyAccess(request, {
      companyId: orgFilter,
      permission: COMPANY_PERMISSIONS.MANAGE_COMPANY,
      feature: COMPANY_FEATURE_KEYS.ADMIN_PANEL,
      allowedRoles: ['OWNER', 'ADMIN'],
    })

    if (!access.ok) {
      return NextResponse.json(access.body, { status: access.status })
    }

    const organizationId = access.context.companyId
    if (!organizationId) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const settingsTable = (supabase as any).from('settings')
    const { data: prevData } = await settingsTable
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig = ((prevData as SettingsValueRow | null)?.value || null) as typeof defaultBusinessConfig | null

    const { error } = await settingsTable
      .upsert(
        {
          key: 'business_config',
          value: defaultBusinessConfig,
          organization_id: organizationId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'organization_id,key',
        }
      )

    if (error) {
      console.error('Error resetting business config:', error)
      return NextResponse.json({ error: 'Error al restablecer configuracion' }, { status: 500 })
    }

    const { data: persistedRow, error: persistedError } = await settingsTable
      .select('value,updated_at')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    if (persistedError) {
      console.error('Error verifying reset business config:', persistedError)
      return NextResponse.json({ error: 'La configuracion se restablecio pero no se pudo verificar' }, { status: 500 })
    }

    const persistedConfig = ((persistedRow as SettingsValueRow | null)?.value || defaultBusinessConfig) as typeof defaultBusinessConfig
    try {
      invalidateCachedConfig(organizationId)
    } catch {}

    await logAudit(
      'business_config.reset',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: persistedConfig,
      },
      {
        id: access.context.userId,
        email: access.context.email,
        role: access.context.role,
      }
    )

    return NextResponse.json({
      success: true,
      config: persistedConfig,
      persisted: true,
      updatedAt: (persistedRow as SettingsValueRow | null)?.updated_at || new Date().toISOString(),
      message: 'Configuracion restablecida a valores predeterminados',
    })
  } catch (error: any) {
    console.error('Error in POST /api/business-config/reset:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
