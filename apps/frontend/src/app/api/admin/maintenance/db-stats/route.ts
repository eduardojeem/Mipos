import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { isSupabaseActive } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const { isSuperAdmin } = auth

  // Solo super admin puede ver estadísticas globales de la base de datos
  if (!isSuperAdmin) {
    return NextResponse.json({ 
      success: false, 
      error: 'Requiere permisos de Super Admin' 
    }, { status: 403 })
  }

  if (!isSupabaseActive()) {
    return NextResponse.json({ success: true, tables: [], counts: {} })
  }

  try {
    const supabase = await createClient()
    const sql = `
      select
        relname as table,
        pg_total_relation_size(relid) as bytes,
        pg_size_pretty(pg_total_relation_size(relid)) as pretty,
        n_live_tup as estimated_rows
      from pg_catalog.pg_statio_user_tables
      order by pg_total_relation_size(relid) desc
      limit 20;
    `
    let tables: any[] = []
    try {
      const { data, error } = await (supabase as any).rpc('exec_sql', { sql })
      if (!error && Array.isArray(data)) {
        tables = data
      }
    } catch {}

    const counts: Record<string, number> = {}
    const countFor = async (name: string, col: string = 'id') => {
      try {
        const { count, error } = await supabase.from(name).select(col, { count: 'exact', head: true })
        if (!error) counts[name] = count || 0
      } catch {}
    }
    await Promise.all([
      countFor('sales', 'id'),
      countFor('sale_items', 'id'),
      countFor('customers', 'id'),
      countFor('products', 'id'),
      countFor('audit_logs', 'id'),
      countFor('sessions', 'id')
    ])

    return NextResponse.json({ success: true, tables, counts })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error' }, { status: 500 })
  }
}
