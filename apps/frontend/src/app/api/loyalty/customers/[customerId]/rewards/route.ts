import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ data: [] })

    const url = new URL(request.url)
    const programId = url.searchParams.get('programId')
    const status = url.searchParams.get('status') || undefined

    // Obtener IDs de customer_loyalty para el cliente (y programa si se especifica)
    let clQuery = (supabase as any)
      .from('customer_loyalty')
      .select('id, program_id')
      .eq('customer_id', customerId)
    if (programId) clQuery = clQuery.eq('program_id', programId)
    const { data: cls, error: clErr } = await clQuery
    if (clErr) return NextResponse.json({ error: clErr.message }, { status: 500 })
    const clIds = (cls || []).map((x: any) => x.id)

    if (clIds.length === 0) return NextResponse.json({ data: [] })

    let query = (supabase as any)
      .from('customer_rewards')
      .select('*, reward:loyalty_rewards(*)')
      .in('customer_loyalty_id', clIds)
    if (programId) query = query.eq('program_id', programId)
    if (status) query = query.eq('status', status)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (data || []).map((cr: any) => ({
      id: cr.id,
      customerLoyaltyId: cr.customer_loyalty_id,
      rewardId: cr.reward_id,
      status: cr.status,
      redeemedAt: cr.redeemed_at || undefined,
      usedAt: cr.used_at || undefined,
      expirationDate: cr.expiration_date || undefined,
      saleId: cr.sale_id || undefined,
      reward: cr.reward && {
        id: cr.reward.id,
        programId: cr.reward.program_id,
        name: cr.reward.name,
        description: cr.reward.description || undefined,
        type: cr.reward.type,
        value: Number(cr.reward.value || 0),
        pointsCost: Number(cr.reward.points_cost || 0),
        maxRedemptions: cr.reward.max_redemptions ?? undefined,
        currentRedemptions: Number(cr.reward.current_redemptions || 0),
        validFrom: cr.reward.valid_from || undefined,
        validUntil: cr.reward.valid_until || undefined,
        isActive: cr.reward.is_active,
        categoryId: cr.reward.category_id || undefined,
        productId: cr.reward.product_id || undefined,
        createdAt: cr.reward.created_at,
        updatedAt: cr.reward.updated_at,
      }
    }))
    return NextResponse.json({ data: items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}