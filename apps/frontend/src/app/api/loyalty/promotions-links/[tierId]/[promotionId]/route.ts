import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import api from '@/lib/api'

// Backend URL resolution removed in favor of centralized api client

export async function DELETE(request: NextRequest, context: { params: Promise<{ tierId: string, promotionId: string }> }) {
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
      const { tierId, promotionId } = await context.params
      const response = await api.delete(`/loyalty/promotions-links/${tierId}/${promotionId}`)
      return NextResponse.json(response.data)
    } catch (err: any) {
      const status = err?.response?.status ?? 500
      const details = err?.response?.data || err?.message || 'Unknown error'
      return NextResponse.json({ error: `Backend error: ${status}`, details }, { status })
    }
  } catch (error) {
    console.error('Error in loyalty/promotions-links/[tierId]/[promotionId] DELETE route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}