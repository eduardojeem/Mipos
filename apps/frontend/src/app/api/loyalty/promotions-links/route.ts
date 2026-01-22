import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

// Backend URL resolution removed in favor of centralized api client

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await (supabase as any).auth.getUser()

    let authToken: string | null = null
    const isMockAuth = !user || !!userError
    if (!isMockAuth) {
      const { data: { session } } = await (supabase as any).auth.getSession()
      authToken = session?.access_token ?? null
    } else {
      authToken = 'mock-token'
    }

    try {
      const response = await api.get('/loyalty/promotions-links')
      return NextResponse.json(response.data)
    } catch (err: any) {
      const status = err?.response?.status ?? 500
      const details = err?.response?.data || err?.message || 'Unknown error'
      return NextResponse.json({ error: `Backend error: ${status}`, details }, { status })
    }
  } catch (error) {
    console.error('Error in loyalty/promotions-links GET route:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    return NextResponse.json({ error: 'Internal server error', message, stack }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    let authToken: string | null = null
    const isMockAuth = !user || !!userError
    if (!isMockAuth) {
      const { data: { session } } = await supabase.auth.getSession()
      authToken = session?.access_token ?? null
    } else {
      authToken = 'mock-token'
    }

    const body = await request.json()
    try {
      const response = await api.post('/loyalty/promotions-links', body)
      return NextResponse.json(response.data)
    } catch (err: any) {
      const status = err?.response?.status ?? 500
      const details = err?.response?.data || err?.message || 'Unknown error'
      return NextResponse.json({ error: `Backend error: ${status}`, details }, { status })
    }
  } catch (error) {
    console.error('Error in loyalty/promotions-links POST route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}