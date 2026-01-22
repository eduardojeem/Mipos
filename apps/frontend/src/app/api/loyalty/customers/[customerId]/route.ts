import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

export async function GET(request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) {
      const programId = new URL(request.url).searchParams.get('programId') || undefined
      const resp = await api.get(`/loyalty/customers/${customerId}`, { params: { programId } })
      const raw: any = resp.data
      const data = raw?.data ?? raw
      return NextResponse.json({ data })
    }

    const programId = new URL(request.url).searchParams.get('programId')

    let query = (supabase as any)
      .from('customer_loyalty')
      .select('*')
      .eq('customer_id', customerId)

    if (programId) query = query.eq('program_id', programId)

    const { data, error } = await query.limit(1).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch program and tier
    const [{ data: program }, { data: tier }] = await Promise.all([
      (supabase as any)
        .from('loyalty_programs')
        .select('*')
        .eq('id', data.program_id)
        .single(),
      data.current_tier_id
        ? (supabase as any)
            .from('loyalty_tiers')
            .select('*')
            .eq('id', data.current_tier_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    const mapped = {
      id: data.id,
      customerId: data.customer_id,
      programId: data.program_id,
      currentPoints: data.current_points || 0,
      totalPointsEarned: data.total_points_earned || 0,
      totalPointsRedeemed: data.total_points_redeemed || 0,
      currentTierId: data.current_tier_id || undefined,
      enrollmentDate: data.enrollment_date,
      lastActivityDate: data.last_activity_date || undefined,
      program: program && {
        id: program.id,
        name: program.name,
        description: program.description || undefined,
        pointsPerPurchase: program.points_per_purchase,
        minimumPurchase: program.minimum_purchase,
        welcomeBonus: program.welcome_bonus,
        birthdayBonus: program.birthday_bonus,
        referralBonus: program.referral_bonus,
        pointsExpirationDays: program.points_expiration_days ?? undefined,
        isActive: program.is_active,
        createdAt: program.created_at,
        updatedAt: program.updated_at,
      },
      currentTier: tier && {
        id: tier.id,
        programId: tier.program_id,
        name: tier.name,
        description: tier.description || undefined,
        minPoints: tier.min_points,
        multiplier: tier.multiplier,
        benefits: tier.benefits || undefined,
        color: tier.color || undefined,
        isActive: tier.is_active,
        createdAt: tier.created_at,
        updatedAt: tier.updated_at,
      }
    }

    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}