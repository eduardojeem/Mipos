import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request)
  if (!('ok' in auth) || auth.ok === false) {
    return NextResponse.json(auth.body, { status: auth.status })
  }

  const supabase = createAdminClient() as any
  try {
    const { count } = await supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })

    const { count: couponsCount } = await supabase
      .from('coupons')
      .select('code', { count: 'exact', head: true })

    if ((count ?? 0) > 0) {
      return NextResponse.json({ success: true, seeded: false, count, couponsCount: couponsCount ?? 0 })
    }

    const now = new Date()
    const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString()
    const startDaysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()

    const promos = [
      {
        name: 'Descuento 10% General',
        description: 'Promoción general del 10% en todo',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        min_purchase_amount: 0,
        max_discount_amount: null,
        usage_limit: null,
        usage_count: 0,
        start_date: startDaysAgo(30),
        end_date: addDays(180),
        is_active: true,
        approval_status: 'approved',
      },
      {
        name: 'Monto fijo $50000',
        description: 'Promoción de monto fijo',
        discount_type: 'FIXED_AMOUNT',
        discount_value: 50000,
        min_purchase_amount: 100000,
        max_discount_amount: 50000,
        usage_limit: null,
        usage_count: 0,
        start_date: startDaysAgo(10),
        end_date: addDays(90),
        is_active: true,
        approval_status: 'approved',
      },
      {
        name: 'Navidad 20%',
        description: 'Promoción navideña',
        discount_type: 'PERCENTAGE',
        discount_value: 20,
        min_purchase_amount: 150000,
        max_discount_amount: 200000,
        usage_limit: 1,
        usage_count: 0,
        start_date: new Date(new Date(now.getFullYear(), 10, 1).getTime()).toISOString(),
        end_date: new Date(new Date(now.getFullYear(), 11, 1).getTime()).toISOString(),
        is_active: true,
        approval_status: 'approved',
      },
    ]

    const { data: inserted, error } = await supabase
      .from('promotions')
      .insert(promos)
      .select('id,name')

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const ids = (inserted || []).map((p: any) => ({ id: String(p.id), name: String(p.name) }))
    if (ids.length > 0) {
      const positions = ids
        .sort((a: { id: string; name: string }, b: { id: string; name: string }) => a.name.localeCompare(b.name))
        .map((p: { id: string; name: string }, idx: number) => ({ promotion_id: p.id, position: idx }))
      await supabase.from('promotions_carousel').upsert(positions)
    }

    const { count: afterCount } = await supabase
      .from('promotions')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({ success: true, seeded: true, count: afterCount ?? ids.length, couponsCount: couponsCount ?? 0, items: ids })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Error interno' }, { status: 500 })
  }
}