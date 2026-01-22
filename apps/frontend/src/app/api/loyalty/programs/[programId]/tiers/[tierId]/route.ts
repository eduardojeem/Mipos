import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, context: { params: Promise<{ programId: string; tierId: string }> }) {
  try {
    const { programId, tierId } = await context.params
    const body = await request.json()
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })

    const payload: any = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) payload.name = body.name
    if (body.description !== undefined) payload.description = body.description
    if (body.minPoints !== undefined) payload.min_points = Number(body.minPoints)
    if (body.multiplier !== undefined) payload.multiplier = Number(body.multiplier)
    if (body.benefits !== undefined) payload.benefits = body.benefits
    if (body.color !== undefined) payload.color = body.color
    if (body.isActive !== undefined) payload.is_active = Boolean(body.isActive)

    const { data, error } = await (supabase as any)
      .from('loyalty_tiers')
      .update(payload)
      .eq('id', tierId)
      .eq('program_id', programId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const mapped = {
      id: data.id,
      programId: data.program_id,
      name: data.name,
      description: data.description || undefined,
      minPoints: data.min_points,
      multiplier: data.multiplier,
      benefits: data.benefits || undefined,
      color: data.color || undefined,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
    return NextResponse.json({ data: mapped })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}