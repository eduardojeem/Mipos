import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ programId: string }> }) {
  try {
    const { programId } = await context.params
    const supabase = await createClient()
    const canQuery = typeof (supabase as any)?.from === 'function'
    if (!canQuery) return NextResponse.json({ data: [] })

    const { data: cls, error } = await (supabase as any)
      .from('customer_loyalty')
      .select('id, customer_id, current_points, enrollment_date')
      .eq('program_id', programId)
      .order('enrollment_date', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (cls || []).map((x: any) => x.customer_id)
    let customersById: Record<string, any> = {}
    if (ids.length) {
      const { data: customers } = await (supabase as any)
        .from('customers')
        .select('id, name, email, phone')
        .in('id', ids)
      for (const c of (customers || [])) customersById[c.id] = c
    }

    const items = (cls || []).map((x: any) => ({
      id: x.id,
      customerId: x.customer_id,
      currentPoints: x.current_points || 0,
      enrollmentDate: x.enrollment_date,
      customer: customersById[x.customer_id] || null,
    }))
    return NextResponse.json({ data: items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}