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

    // Cache: dashboard stats can tolerate ~1 min staleness; SWR keeps the
    // last-good copy visible while a fresh one loads in the background.
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
      },
    })
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
    // Don't cache the fallback — we want the next request to retry.
    return NextResponse.json(fallback, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}