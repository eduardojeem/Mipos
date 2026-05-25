import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_API_ACCESS, requireAdminApiAccess } from '@/app/api/admin/_utils/access'

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminApiAccess(request, {
      ...ADMIN_API_ACCESS.adminPanel,
      requireOrganization: true,
    })
    if (!access.ok) {
      return access.response
    }

    const organizationId = access.context.companyId
    if (!organizationId) {
      return NextResponse.json({ error: 'Selecciona una organizacion' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get organization stats
    const [usersCount, productsCount, salesCount, customersCount, storageSize, auditLogsCount] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('sales').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      // Storage calculation (simplified - you may want to calculate actual file sizes)
      supabase.from('products').select('image_url').eq('organization_id', organizationId),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId)
    ])

    // Calculate storage (simplified - count images)
    const imageCount = storageSize.data?.filter((p: any) => p.image_url).length || 0
    const estimatedStorageMB = imageCount * 0.5 // Estimate 0.5 MB per image

    return NextResponse.json({
      success: true,
      stats: {
        users: usersCount.count || 0,
        products: productsCount.count || 0,
        sales: salesCount.count || 0,
        customers: customersCount.count || 0,
        storage: estimatedStorageMB,
        auditLogs: auditLogsCount.count || 0
      }
    })
  } catch (error) {
    console.error('Error fetching organization stats:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener estadísticas' 
    }, { status: 500 })
  }
}
