import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled, getEnvMode } from '@/lib/env'

async function resolveBackendUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  return envUrl && envUrl.trim() ? envUrl : 'http://localhost:3000/api'
}

export async function GET(request: NextRequest, context: { params: Promise<{ tierId: string }> })
{
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    const mockEnabled = isMockAuthEnabled()
    const envMode = getEnvMode()

    let authToken: string | undefined
    if (!mockEnabled && user && !userError) {
      const { data: { session } } = await supabase.auth.getSession()
      authToken = session?.access_token || undefined
    } else if (mockEnabled) {
      authToken = 'mock-token'
    }

    const backendUrl = await resolveBackendUrl()
    const { tierId } = await context.params
    const url = `${backendUrl}/loyalty/tiers/${tierId}/promotions-links`

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Env-Mode': envMode,
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...(mockEnabled ? { 'x-user-id': 'mock-user-id', 'x-user-role': 'admin' } : {})
    }

    const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const errJson = await response.json()
        return NextResponse.json(errJson, { status: response.status })
      } else {
        const errorData = await response.text()
        return NextResponse.json({ error: `Backend error: ${response.status}`, details: errorData }, { status: response.status })
      }
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in loyalty/tiers/[tierId]/promotions-links GET route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}