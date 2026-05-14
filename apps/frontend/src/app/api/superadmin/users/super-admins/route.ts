import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertSuperAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient()

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
      .eq('role', 'SUPER_ADMIN')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(start, end)
    if (error || !Array.isArray(data)) {
      // SECURITY: do NOT fall back to listing auth users filtered by
      // user_metadata.role — that field is user-modifiable, so the fallback
      // would surface impostors as "super admins". Fail closed instead.
      return NextResponse.json({ error: 'Error listando super admins', details: error?.message || 'consulta no disponible' }, { status: 500 })
    }

    return NextResponse.json({ success: true, users: data, total: count || data.length, page, limit, source: 'db' })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
