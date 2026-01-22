import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, reason } = body || {}

    if (!productId || typeof quantity !== 'number' || !reason) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const resp = await api.post('/inventory/adjust', { productId, quantity, reason })
    return NextResponse.json(resp.data)
  } catch (err: any) {
    const status = err?.response?.status ?? 500
    const details = err?.response?.data || err?.message || 'Unknown error'
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details }, { status })
  }
}