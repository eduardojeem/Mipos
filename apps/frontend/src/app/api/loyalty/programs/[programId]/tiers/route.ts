import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ data: [] })
    const { data, error } = await (supabase as any)
      .from('loyalty_tiers')
      .select('*')
      .eq('program_id', programId)
      .order('min_points')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const mapped = (data || []).map((t: any) => ({
      id: t.id,
      programId: t.program_id,
      name: t.name,
      description: t.description || undefined,
      minPoints: t.min_points,
      multiplier: t.multiplier,
      benefits: t.benefits || undefined,
      color: t.color || undefined,
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }))
    return NextResponse.json({ data: mapped })
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
      min_points: Number(body.minPoints || 0),
      multiplier: Number(body.multiplier || 1),
      benefits: body.benefits || null,
      color: body.color || null,
      is_active: Boolean(body.isActive ?? true),
      created_at: now,
      updated_at: now,
    }
    const { data, error } = await (supabase as any)
      .from('loyalty_tiers')
      .insert(payload)
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