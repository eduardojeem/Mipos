import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { organizationId, isSuperAdmin } = auth
  const supabase = await createClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
    const limitRaw = parseInt(searchParams.get('limit') ?? '10', 10)
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)
    const limit = Number.isNaN(limitRaw) ? 10 : Math.max(1, Math.min(100, limitRaw))
    const offset = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()

    const now = new Date().toISOString()
    let query = (supabase as any)
      .from('coupons')
      .select('code,type,value,start_date,end_date,is_active,usage_limit', { count: 'exact' })
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)

    // Filtrar por organización si no es super admin
    if (!isSuperAdmin && organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    if (search) {
      query = query.ilike('code', `%${search}%`)
    }

    const { data, error, count } = await query.order('start_date', { ascending: false }).range(offset, offset + limit - 1)
    
    // Si la tabla no existe, retornar array vacío en lugar de error
    if (error && error.message?.includes('does not exist')) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        count: 0, 
        page, 
        limit,
        message: 'Tabla de cupones no configurada'
      })
    }
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data: data || [], count: count || 0, page, limit })
  } catch (e: any) {
    // Manejar cualquier error inesperado
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Error interno' 
    }, { status: 500 })
  }
}