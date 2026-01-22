import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, context: { params: Promise<{ programId: string; rewardId: string }> }) {
  try {
    const { programId, rewardId } = await context.params
    const body = await request.json()
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

    const payload: any = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) payload.name = body.name
    if (body.description !== undefined) payload.description = body.description
    if (body.type !== undefined) payload.type = body.type
    if (body.value !== undefined) payload.value = Number(body.value)
    if (body.pointsCost !== undefined) payload.points_cost = Number(body.pointsCost)
    if (body.maxRedemptions !== undefined) payload.max_redemptions = body.maxRedemptions
    if (body.validFrom !== undefined) payload.valid_from = body.validFrom
    if (body.validUntil !== undefined) payload.valid_until = body.validUntil
    if (body.isActive !== undefined) payload.is_active = Boolean(body.isActive)
    if (body.categoryId !== undefined) payload.category_id = body.categoryId || null
    if (body.productId !== undefined) payload.product_id = body.productId || null

    const { data, error } = await (supabase as any)
      .from('loyalty_rewards')
      .update(payload)
      .eq('id', rewardId)
      .eq('program_id', programId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = {
      id: data.id,
      programId: data.program_id,
      name: data.name,
      description: data.description || undefined,
      type: data.type,
      value: Number(data.value || 0),
      pointsCost: Number(data.points_cost || 0),
      maxRedemptions: data.max_redemptions ?? undefined,
      currentRedemptions: Number(data.current_redemptions || 0),
      validFrom: data.valid_from || undefined,
      validUntil: data.valid_until || undefined,
      isActive: data.is_active,
      categoryId: data.category_id || undefined,
      productId: data.product_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}