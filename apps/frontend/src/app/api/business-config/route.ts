import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { getUserOrganizationId } from '@/app/api/_utils/organization'
import { validateBusinessConfig } from '@/app/api/admin/_utils/business-config-validation'
import { logAudit } from '@/app/api/admin/_utils/audit'
import type { BusinessConfig } from '@/types/business-config'
import { defaultBusinessConfig } from '@/types/business-config'

// ✅ Per-organization cache with TTL
type CachedConfig = { config: BusinessConfig; expiresAt: number }
const configCache = new Map<string, CachedConfig>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedConfig(orgId: string): BusinessConfig | null {
  const cached = configCache.get(orgId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config
  }
  configCache.delete(orgId)
  return null
}

function setCachedConfig(orgId: string, config: BusinessConfig): void {
  configCache.set(orgId, {
    config,
    expiresAt: Date.now() + CACHE_TTL
  })
}

export async function GET(request: NextRequest) {
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
      // Super admin can query any organization
      organizationId = orgFilter
    } else {
      // Regular admin gets their own organization
      const userOrgId = await getUserOrganizationId(userId)
      if (!userOrgId) {
        return NextResponse.json(
          { error: 'Usuario no pertenece a ninguna organización' },
          { status: 403 }
        )
      }
      organizationId = userOrgId
    }

    // Check cache first
    const cached = getCachedConfig(organizationId)
    if (cached) {
      return NextResponse.json({ success: true, config: cached })
    }

    // ✅ Query with RLS-enabled client
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching business config:', error)
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    // Return default config if not found
    const config = data?.value || defaultBusinessConfig
    setCachedConfig(organizationId, config)

    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('Error in GET /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validation = validateBusinessConfig(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      )
    }

    // Get previous config for audit
    const supabase = await createClient()
    const { data: prevData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'business_config')
      .eq('organization_id', organizationId)
      .single()

    const prevConfig = prevData?.value || null

    // ✅ Update with organization_id
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'business_config',
        value: body,
        organization_id: organizationId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,key'
      })

    if (error) {
      console.error('Error updating business config:', error)
      return NextResponse.json(
        { error: 'Error al actualizar configuración' },
        { status: 500 }
      )
    }

    // Update cache
    setCachedConfig(organizationId, body)

    // Audit log
    await logAudit(
      'business_config.update',
      {
        entityType: 'BUSINESS_CONFIG',
        entityId: organizationId,
        oldData: prevConfig,
        newData: body
      },
      {
        id: userId,
        email: auth.userId,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    )

    return NextResponse.json({ success: true, config: body })
  } catch (error: any) {
    console.error('Error in PUT /api/business-config:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}