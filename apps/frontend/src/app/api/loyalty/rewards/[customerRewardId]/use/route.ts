import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, context: { params: Promise<{ customerRewardId: string }> }) {
  try {
    const { customerRewardId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

    const body = await request.json()
    const { saleId } = body || {}
    const now = new Date().toISOString()

    const { data: cr, error: crErr } = await (supabase as any)
      .from('customer_rewards')
      .select('*')
      .eq('id', customerRewardId)
      .single()
    if (crErr || !cr) return NextResponse.json({ error: crErr?.message || 'Recompensa de cliente no encontrada' }, { status: 404 })
    if (cr.status !== 'AVAILABLE') return NextResponse.json({ error: 'La recompensa no está disponible' }, { status: 400 })

    const { data: updated, error: upErr } = await (supabase as any)
      .from('customer_rewards')
      .update({ status: 'USED', used_at: now, sale_id: saleId, updated_at: now })
      .eq('id', customerRewardId)
      .select()
      .single()
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}