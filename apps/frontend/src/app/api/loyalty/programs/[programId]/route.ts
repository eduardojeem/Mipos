import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(_request: NextRequest, context: { params: Promise<{ programId: string }> }) {
  try {
    const { programId: id } = await context.params
    const body = await _request.json()
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
    }
    const now = new Date().toISOString()
    const payload: any = { updated_at: now }
    if (body.name !== undefined) payload.name = body.name
    if (body.description !== undefined) payload.description = body.description
    if (body.pointsPerPurchase !== undefined) payload.points_per_purchase = Number(body.pointsPerPurchase)
    if (body.minimumPurchase !== undefined) payload.minimum_purchase = Number(body.minimumPurchase)
    if (body.welcomeBonus !== undefined) payload.welcome_bonus = Number(body.welcomeBonus)
    if (body.birthdayBonus !== undefined) payload.birthday_bonus = Number(body.birthdayBonus)
    if (body.referralBonus !== undefined) payload.referral_bonus = Number(body.referralBonus)
    if (body.pointsExpirationDays !== undefined) payload.points_expiration_days = body.pointsExpirationDays
    if (body.isActive !== undefined) payload.is_active = Boolean(body.isActive)

    const { data, error } = await (supabase as any)
      .from('loyalty_programs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      pointsPerPurchase: data.points_per_purchase,
      minimumPurchase: data.minimum_purchase,
      welcomeBonus: data.welcome_bonus,
      birthdayBonus: data.birthday_bonus,
      referralBonus: data.referral_bonus,
      pointsExpirationDays: data.points_expiration_days ?? undefined,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}