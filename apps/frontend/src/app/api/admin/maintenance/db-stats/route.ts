import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/app/api/_utils/auth'
import { isSupabaseActive } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  if (!isSupabaseActive()) {
    return NextResponse.json({ success: true, tables: [], counts: {} })
  }

  try {
    const admin = createAdminClient() as any
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
      const { data, error } = await admin.rpc('exec_sql', { sql })
      if (!error && Array.isArray(data)) {
        tables = data
      }
    } catch {}

    const counts: Record<string, number> = {}
    const countFor = async (name: string, col: string = 'id') => {
      try {
        const { count, error } = await admin.from(name).select(col, { count: 'exact', head: true })
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
