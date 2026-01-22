import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    const resp = await api.get('/inventory/movements', { params })
    const data = resp?.data

    if (data && data.movements) {
      return NextResponse.json({ data: data.movements, pagination: data.pagination })
    }

    return NextResponse.json(data || { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } })
  } catch (err: any) {
    const status = err?.response?.status ?? 500
    const details = err?.response?.data || err?.message || 'Unknown error'
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details }, { status })
  }
}