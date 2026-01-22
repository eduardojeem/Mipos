import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await context.params
    const body = await request.json()
    const { programId, purchaseAmount } = body || {}
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

    const { data: program, error: pErr } = await (supabase as any)
      .from('loyalty_programs')
      .select('*')
      .eq('id', programId)
      .single()
    if (pErr || !program) return NextResponse.json({ error: pErr?.message || 'Programa no encontrado' }, { status: 404 })

    // Obtener tier actual del cliente (si aplica) para multiplicador
    const { data: cl } = await (supabase as any)
      .from('customer_loyalty')
      .select('current_tier_id')
      .eq('customer_id', customerId)
      .eq('program_id', programId)
      .single()
    let multiplier = 1
    if (cl?.current_tier_id) {
      const { data: tier } = await (supabase as any)
        .from('loyalty_tiers')
        .select('multiplier')
        .eq('id', cl.current_tier_id)
        .single()
      multiplier = Number(tier?.multiplier || 1)
    }

    const min = Number(program.minimum_purchase || 0)
    const base = Number(program.points_per_purchase || 0)
    const amount = Number(purchaseAmount || 0)
    const points = amount >= min ? Math.floor(amount * base * multiplier) : 0

    return NextResponse.json({ data: { points, purchaseAmount: amount } })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}