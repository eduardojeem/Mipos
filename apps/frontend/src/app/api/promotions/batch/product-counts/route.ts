import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isSupabaseActive } from '@/lib/env'
import { resolveOrganizationId } from '@/lib/organization'

// POST /api/promotions/batch/product-counts
// Returns { counts: { [promotionId]: number } } for a list of promotion IDs
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseActive()) {
      return NextResponse.json({ success: false, message: 'Supabase no está activo' }, { status: 503 })
    }

    const orgId = (await resolveOrganizationId(request)) || ''
    if (!orgId) {
      return NextResponse.json({ success: false, message: 'Organization header missing' }, { status: 400 })
    }

    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : []

    if (ids.length === 0) {
      return NextResponse.json({ success: true, counts: {} })
    }

    if (ids.length > 100) {
      return NextResponse.json({ success: false, message: 'Máximo 100 IDs por request' }, { status: 400 })
    }

    // Use admin client to bypass RLS on promotions_products
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('promotions_products')
      .select('promotion_id')
      .eq('organization_id', orgId)
      .in('promotion_id', ids)

    if (error) {
      console.error('[batch/product-counts] Supabase error:', error.message)
      return NextResponse.json(
        { success: false, message: 'Error al obtener conteos', details: error.message },
        { status: 500 }
      )
    }

    // Initialize all IDs with 0, then count
    const counts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]))
    ;(data || []).forEach((row: { promotion_id: string }) => {
      const pid = String(row.promotion_id)
      counts[pid] = (counts[pid] ?? 0) + 1
    })

    return NextResponse.json({ success: true, counts })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error interno'
    console.error('[batch/product-counts] Unexpected error:', msg)
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
