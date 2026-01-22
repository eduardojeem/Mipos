import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

// Backend URL resolution removed in favor of centralized api client

function isDevMockMode() {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = process.env.NODE_ENV === 'development'
  return isDev && (!hasSupabaseEnv || process.env.MOCK_AUTH === 'true')
}

function computeLocalPricing(body: any) {
  const IVA_RATE = Number(process.env.NEXT_PUBLIC_IVA_RATE ?? '0.16')
  const items = Array.isArray(body?.items) ? body.items : (Array.isArray(body?.cart) ? body.cart : [])
  let subtotal = 0
  try {
    for (const item of items) {
      const price = Number(
        item?.unitPrice ?? item?.price ?? item?.product?.price ?? 0
      )
      const qty = Number(item?.quantity ?? item?.qty ?? 1)
      subtotal += price * qty
    }
  } catch {}

  const discountType = (body?.discountType === 'PERCENTAGE' || body?.discountType === 'FIXED_AMOUNT')
    ? body.discountType
    : 'FIXED_AMOUNT'
  const discount = Number(body?.discount ?? 0)

  const discountAmount = discountType === 'PERCENTAGE'
    ? Math.max(0, Math.round(((subtotal || 0) * (discount / 100) + Number.EPSILON) * 100) / 100)
    : Math.max(0, Math.round(((discount || 0) + Number.EPSILON) * 100) / 100)

  const base = Math.max(0, subtotal - discountAmount)
  const taxAmount = Math.round(((base * IVA_RATE) + Number.EPSILON) * 100) / 100
  const finalTotal = Math.round(((base + taxAmount) + Number.EPSILON) * 100) / 100

  return {
    data: {
      subtotal,
      discountAmount,
      taxAmount,
      finalTotal,
      ivaRate: IVA_RATE,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    let authToken: string | null = null
    const isMockAuth = !session || !!sessionError
    authToken = isMockAuth ? 'mock-token' : session!.access_token

    const body = await request.json()
    try {
      const response = await api.post('/pricing/evaluate', body)
      return NextResponse.json(response.data)
    } catch (err: any) {
      if (isDevMockMode()) {
        const local = computeLocalPricing(body)
        return NextResponse.json(local, { status: 200 })
      }
      const status = err?.response?.status ?? 500
      const details = err?.response?.data || err?.message || 'Unknown error'
      return NextResponse.json(
        { error: `Backend error: ${status}`, details },
        { status }
      )
    }

  } catch (error) {
    console.error('Error in pricing/evaluate API route:', error)
    // Fallback local si estamos en modo desarrollo/mock
    if (isDevMockMode()) {
      try {
        const body = await request.json()
        const local = computeLocalPricing(body)
        return NextResponse.json(local, { status: 200 })
      } catch {}
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}