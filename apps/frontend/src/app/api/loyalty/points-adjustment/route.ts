import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage } from '@/lib/api'

export async function POST(request: NextRequest) {
  let body: any = null
  try {
    body = await request.json()
    const { data } = await api.post('/loyalty/points-adjustment', body)
    return NextResponse.json(data)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data ?? getErrorMessage(error)
    return NextResponse.json(
      { error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details, body },
      { status }
    )
  }
}