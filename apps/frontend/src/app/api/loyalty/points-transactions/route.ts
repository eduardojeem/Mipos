import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId') || undefined
    const programId = url.searchParams.get('programId') || undefined
    const type = url.searchParams.get('type') || undefined
    const referenceType = url.searchParams.get('referenceType') || undefined
    const startDate = url.searchParams.get('startDate') || undefined
    const endDate = url.searchParams.get('endDate') || undefined
    const page = Number(url.searchParams.get('page') || '1')
    const pageSize = Number(url.searchParams.get('pageSize') || '50')

    let txQuery = (supabase as any)
      .from('points_transactions')
      .select('id, customer_loyalty_id, program_id, type, points, description, reference_type, created_at')

    if (customerId) {
      const { data: cls } = await (supabase as any)
        .from('customer_loyalty')
        .select('id, program_id')
        .eq('customer_id', customerId)
        .maybeSingle()
      if (cls?.id) txQuery = txQuery.eq('customer_loyalty_id', cls.id)
      if (programId) txQuery = txQuery.eq('program_id', programId)
    } else if (programId) {
      txQuery = txQuery.eq('program_id', programId)
    }

    if (type && type !== 'all') txQuery = txQuery.eq('type', type)
    if (referenceType) txQuery = txQuery.eq('reference_type', referenceType)
    if (startDate) txQuery = txQuery.gte('created_at', startDate)
    if (endDate) txQuery = txQuery.lte('created_at', endDate)

    const from = Math.max(0, (page - 1) * pageSize)
    const to = Math.max(from, from + pageSize - 1)

    const { data, error } = await txQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return NextResponse.json({ data: { items: [] } })

    const items = (data || []).map((t: any) => ({
      id: t.id,
      customerLoyaltyId: t.customer_loyalty_id,
      programId: t.program_id,
      type: t.type,
      points: Number(t.points || 0),
      description: t.description || '',
      referenceType: t.reference_type || undefined,
      createdAt: t.created_at,
    }))

    return NextResponse.json({ data: { items } })
  } catch (error: any) {
    const now = new Date().toISOString()
    const items = [
      { id: 'mock-earned', customerLoyaltyId: 'mock-cl', programId: 'mock-program', type: 'EARNED', points: 150, description: 'Compra demo', referenceType: 'SALE', createdAt: now },
      { id: 'mock-bonus', customerLoyaltyId: 'mock-cl', programId: 'mock-program', type: 'BONUS', points: 300, description: 'Bono bienvenida', referenceType: 'WELCOME', createdAt: now },
      { id: 'mock-redeemed', customerLoyaltyId: 'mock-cl', programId: 'mock-program', type: 'REDEEMED', points: 300, description: 'Canje recompensa', referenceType: 'REWARD', createdAt: now },
    ]
    return NextResponse.json({ data: { items } })
  }
}