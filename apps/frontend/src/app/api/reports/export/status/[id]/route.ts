import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'
import { isMockAuthEnabled } from '@/lib/env'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const response = await api.get(`/reports/export/status/${id}`)
    return NextResponse.json(response.data)
  } catch (error: any) {
    const status = error?.response?.status ?? 500
    const details = error?.response?.data || error?.message || 'Unknown error'
    return NextResponse.json({ error: status === 500 ? 'Internal server error' : `Backend error: ${status}`, details }, { status })
  }
}
