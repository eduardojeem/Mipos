import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, context: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ data: [] })

    const customerId = new URL(request.url).searchParams.get('customerId')

    const { data, error } = await (supabase as any)
      .from('loyalty_rewards')
      .select('*')
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let rewards = (data || []).map((r: any) => ({
      id: r.id,
      programId: r.program_id,
      name: r.name,
      description: r.description || undefined,
      type: r.type,
      value: Number(r.value || 0),
      pointsCost: Number(r.points_cost || 0),
      maxRedemptions: r.max_redemptions ?? undefined,
      currentRedemptions: Number(r.current_redemptions || 0),
      validFrom: r.valid_from || undefined,
      validUntil: r.valid_until || undefined,
      isActive: r.is_active,
      categoryId: r.category_id || undefined,
      productId: r.product_id || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    if (customerId) {
      const { data: cl } = await (supabase as any)
        .from('customer_loyalty')
        .select('current_points, program_id')
        .eq('customer_id', customerId)
        .eq('program_id', programId)
        .single()
      const current = cl?.current_points ?? 0
      rewards = rewards.filter((r: any) => r.pointsCost <= current)
    }
    return NextResponse.json({ data: rewards })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await context.params
    const body = await request.json()
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

    const now = new Date().toISOString()
    const payload = {
      program_id: programId,
      name: body.name,
      description: body.description || null,
      type: body.type,
      value: Number(body.value || 0),
      points_cost: Number(body.pointsCost || 0),
      max_redemptions: body.maxRedemptions ?? null,
      current_redemptions: 0,
      valid_from: body.validFrom || null,
      valid_until: body.validUntil || null,
      is_active: Boolean(body.isActive ?? true),
      category_id: body.categoryId || null,
      product_id: body.productId || null,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await (supabase as any)
      .from('loyalty_rewards')
      .insert(payload)
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