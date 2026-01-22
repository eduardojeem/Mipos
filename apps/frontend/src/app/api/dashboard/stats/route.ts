import { NextRequest, NextResponse } from 'next/server'
import { api, getErrorMessage } from '@/lib/api'

// Timeout helper
const fetchWithTimeout = async (promise: Promise<any>, timeoutMs: number) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  )
  return Promise.race([promise, timeout])
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Add 10 second timeout
    const { data } = await fetchWithTimeout(
      api.get('/dashboard/stats', { params }),
      10000
    ) as any

    return NextResponse.json(data)
  } catch (error: any) {
    console.warn('Dashboard stats fallback:', error.message)
    // Return empty but valid data structure
    const fallback = {
      success: true,
      data: {
        thisMonthSales: { total: 0, count: 0 },
        lastMonthSales: { total: 0, count: 0 },
        topProducts: [],
        totalCustomers: 0
      }
    }
    return NextResponse.json(fallback)
  }
}