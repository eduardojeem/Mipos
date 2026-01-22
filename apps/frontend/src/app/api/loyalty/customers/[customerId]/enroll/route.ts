import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest, context: { params: Promise<{ customerId: string }> }) {
  try {
    const { customerId } = await context.params
    const body = await request.json()
    const supabase = createAdminClient()

    const now = new Date().toISOString()
    const payload = {
      customer_id: customerId,
      program_id: body.programId,
      current_points: 0,
      total_points_earned: 0,
      total_points_redeemed: 0,
      enrollment_date: now,
      last_activity_date: now,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await (supabase as any)
      .from('customer_loyalty')
      .insert(payload)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = {
      id: data.id,
      customerId: data.customer_id,
      programId: data.program_id,
      currentPoints: data.current_points || 0,
      totalPointsEarned: data.total_points_earned || 0,
      totalPointsRedeemed: data.total_points_redeemed || 0,
      enrollmentDate: data.enrollment_date,
      lastActivityDate: data.last_activity_date || undefined,
      program: undefined,
      currentTier: undefined
    }
    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}