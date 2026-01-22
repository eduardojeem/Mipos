import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

export async function GET(request: NextRequest) {
  try {
    // Require authenticated user unless mock auth is enabled
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user && !isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    } catch {
      if (!isMockAuthEnabled()) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const response = await api.get('/reports/export/jobs', { params: { limit } })
    return NextResponse.json(response.data)
  } catch (error: any) {
    // Fallback amistoso en desarrollo cuando el backend no está disponible
    const isDev = process.env.NODE_ENV !== 'production'
    const noBackend = !error?.response && (error?.code === 'ECONNREFUSED' || error?.code === 'ERR_NETWORK' || /fetch|network/i.test(error?.message || ''))
    if (isDev && (noBackend || isMockAuthEnabled())) {
      return NextResponse.json({ success: true, jobs: [] }, { status: 200 })
    }

    const status = error?.response?.status ?? 500
    const details = error?.response?.data || error?.message || 'Unknown error'
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details }, { status })
  }
}