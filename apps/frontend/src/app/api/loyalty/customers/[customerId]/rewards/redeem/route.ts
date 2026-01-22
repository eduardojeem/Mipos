import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

export async function POST(request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) {
      const body = await request.json()
      const { programId, rewardId } = body || {}
      try {
        const resp = await api.post(`/loyalty/customers/${customerId}/rewards/redeem`, { programId, rewardId })
        return NextResponse.json(resp.data)
      } catch (err: any) {
        const status = err?.response?.status ?? 500
        const details = err?.response?.data || err?.message || 'Unknown error'
        return NextResponse.json({ error: `Backend error: ${status}`, details }, { status })
      }
    }

    const body = await request.json()
    const { programId, rewardId } = body || {}
    const now = new Date().toISOString()

    // Encontrar customer_loyalty
    const { data: cl, error: clErr } = await (supabase as any)
      .from('customer_loyalty')
      .select('id, current_points')
      .eq('customer_id', customerId)
      .eq('program_id', programId)
      .single()
    if (clErr || !cl) return NextResponse.json({ error: clErr?.message || 'Cliente no está inscrito' }, { status: 404 })

    // Obtener reward y validar puntos suficientes
    const { data: reward, error: rErr } = await (supabase as any)
      .from('loyalty_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('program_id', programId)
      .single()
    if (rErr || !reward) return NextResponse.json({ error: rErr?.message || 'Recompensa no encontrada' }, { status: 404 })
    const cost = Number(reward.points_cost || 0)
    if ((cl.current_points || 0) < cost) return NextResponse.json({ error: 'Puntos insuficientes' }, { status: 400 })

    // Crear customer_reward en estado AVAILABLE y descontar puntos
    const { data: cr, error: crErr } = await (supabase as any)
      .from('customer_rewards')
      .insert({
        program_id: programId,
        customer_loyalty_id: cl.id,
        reward_id: rewardId,
        status: 'AVAILABLE',
        redeemed_at: now,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()
    if (crErr) return NextResponse.json({ error: crErr.message }, { status: 500 })

    // Insertar transacción de REDEEMED y actualizar puntos
    await (supabase as any)
      .from('points_transactions')
      .insert({
        customer_loyalty_id: cl.id,
        program_id: programId,
        type: 'REDEEMED',
        points: cost,
        description: `Canje de recompensa: ${reward.name}`,
      })
    const { data: updated } = await (supabase as any)
      .from('customer_loyalty')
      .update({
        current_points: Number(cl.current_points || 0) - cost,
        total_points_redeemed: Number(cl.total_points_redeemed || 0) + cost,
        updated_at: now,
      })
      .eq('id', cl.id)
      .select()
      .single()

    return NextResponse.json({ data: { id: cr.id, reward: reward, status: 'AVAILABLE' } })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}