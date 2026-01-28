import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const searchParams = new URL(request.url).searchParams
    const pageRaw = parseInt(searchParams.get('page') ?? '1', 10)
    const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10)
    const search = (searchParams.get('search') || '').trim()
    const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw)
    const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, Math.min(100, limitRaw))
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('users')
      .select('id,email,full_name,role,status,created_at,last_login', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(start, end)
    if (!error && Array.isArray(data)) {
      return NextResponse.json({ success: true, users: data, total: count || data.length, page, limit })
    }

    let admin
    try {
      admin = createAdminClient() as any
    } catch {
      return NextResponse.json({ success: true, users: [], total: 0, page, limit, warning: 'Sin cliente admin' })
    }

    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage: limit })
    if (listError) {
      return NextResponse.json({ error: 'Error listando usuarios', details: listError.message }, { status: 500 })
    }
    const users = ((listData as any)?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email || '').split('@')[0],
      role: String((u.user_metadata?.role || 'CASHIER')).toUpperCase(),
      status: 'ACTIVE',
      created_at: u.created_at,
      last_login: u.last_sign_in_at,
    }))
    return NextResponse.json({ success: true, users, total: users.length, page, limit, source: 'auth' })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
