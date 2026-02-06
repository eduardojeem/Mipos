import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { defaultBusinessConfig } from '@/types/business-config'
import { invalidateCachedConfig } from '../cache'
import { logAudit } from '../../admin/_utils/audit'

export async function POST(request: NextRequest) {
  try {
    // ✅ Authentication and authorization
    const auth = await assertAdmin(request)
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const userId = auth.userId as string
    const isSuperAdmin = auth.isSuperAdmin || false

    // ✅ Get organization context
    const { searchParams } = new URL(request.url)
    const orgFilter = searchParams.get('organizationId') || searchParams.get('organization_id')
    
    let organizationId: string
    if (isSuperAdmin && orgFilter) {
      organizationId = orgFilter
    } else {
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Get current config for audit
    const supabase = await createClient()
    const { data: prevData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig = prevData?.value || null

    // ✅ Reset to defaults with organization_id
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'business_config',
        value: defaultBusinessConfig,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,key'
      })

    if (error) {
      console.error('Error resetting business config:', error)
      return NextResponse.json(
        { error: 'Error al restablecer configuración' },
        { status: 500 }
      )
    }

    // Invalidate cache para garantizar GET fresco
    try { invalidateCachedConfig(organizationId) } catch {}

    // Audit log
    await logAudit(
      'business_config.reset',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: defaultBusinessConfig
      },
      {
        id: userId,
        email: auth.userId,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    )

    return NextResponse.json({
      success: true,
      config: defaultBusinessConfig,
      message: 'Configuración restablecida a valores predeterminados'
    })
  } catch (error: any) {
    console.error('Error in POST /api/business-config/reset:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
