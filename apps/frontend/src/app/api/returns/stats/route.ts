import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin
    // Fetch returns list from local proxy
    const res = await fetch(`${origin}/api/returns${new URL(request.url).search}`, {
      headers: {
        authorization: request.headers.get('authorization') || '',
        'x-organization-id': request.headers.get('x-organization-id') || ''
      }
    })
    const data = await res.json()
    const returns = Array.isArray(data?.returns) ? data.returns : Array.isArray(data?.data) ? data.data : []

    const totalReturns = returns.length
    const totalAmount = returns.reduce((sum: number, r: any) => sum + (r.total || r.totalAmount || 0), 0)
    const pendingReturns = returns.filter((r: any) => String(r.status).toUpperCase() === 'PENDING').length
    const approvedReturns = returns.filter((r: any) => String(r.status).toUpperCase() === 'APPROVED').length
    const rejectedReturns = returns.filter((r: any) => String(r.status).toUpperCase() === 'REJECTED').length
    const processedReturns = returns.filter((r: any) => String(r.status).toUpperCase() === 'COMPLETED' || String(r.status).toUpperCase() === 'PROCESSED').length
    const avgProcessingTime = 0
    const returnRate = totalReturns // Placeholder metric; adjust with sales base if needed

    return NextResponse.json({
      totalReturns,
      totalAmount,
      pendingReturns,
      approvedReturns,
      rejectedReturns,
      processedReturns,
      avgProcessingTime,
      returnRate
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to compute returns stats' }, { status: 500 })
  }
}

