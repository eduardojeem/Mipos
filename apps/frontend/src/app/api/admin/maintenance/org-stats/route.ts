import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAdmin(request)
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status })
    }

    const { organizationId } = auth
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
