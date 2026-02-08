import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { closingAmount, notes } = body

    const orgId = (request.headers.get('x-organization-id') || '').trim()
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 })
    }

    if (typeof closingAmount !== 'number' || !Number.isFinite(closingAmount) || closingAmount < 0) {
      return NextResponse.json({ error: 'Invalid closing amount' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)
    const canUseSupabase = typeof (supabase as any)?.from === 'function'
    const { data: { user }, error: authError } = await (supabase as any).auth.getUser?.() || { data: { user: null }, error: new Error('No auth') }
    const { data: { session } } = await (supabase as any).auth.getSession?.() || { data: { session: null } }
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!canUseSupabase && !(url && serviceKey)) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    let svc: any = null
    if (url && serviceKey) {
      try { svc = createServiceClient(url as string, serviceKey as string) } catch { }
    }

    const queryClient: any = canUseSupabase ? (supabase as any) : svc
    const { data: sessions, error: findError } = await queryClient
      .from('cash_sessions')
      .select('id, opening_amount, status, opened_at, notes, organization_id')
      .or('status.eq.open,status.eq.OPEN')
      .eq('organization_id', orgId)
      .limit(1)

    if (findError) {
      const lower = String(findError.message || '').toLowerCase();
      if (String(findError.code).toUpperCase() === 'PGRST205' || lower.includes('could not find the table')) {
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
        if (backendUrl) {
          try {
            const resp = await fetch(`${backendUrl}/cash/session/close`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
              },
              body: JSON.stringify({ closingAmount, notes })
            });
            const txt = await resp.text();
            if (resp.ok) {
              try { return NextResponse.json(JSON.parse(txt)); } catch { return NextResponse.json({ session: txt }); }
            }
            return NextResponse.json({ error: 'Failed to close session (backend)', details: txt }, { status: resp.status });
          } catch (be) {
            return NextResponse.json({ error: 'Backend unavailable for closing', details: (be as any)?.message || String(be) }, { status: 502 });
          }
        }
      }
      return NextResponse.json({ error: 'Failed to fetch session', details: findError.message, code: findError.code }, { status: 500 })
    }
    const openSession = Array.isArray(sessions) ? sessions[0] : null
    if (!openSession) {
      return NextResponse.json({ error: 'No open session' }, { status: 404 })
    }

    const updater: any = svc || (supabase as any)
    const { data: updated, error: updateError } = await updater
      .from('cash_sessions')
      .update({
        closing_amount: closingAmount,
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        status: 'CLOSED',
        notes: notes || openSession.notes || null
      })
      .eq('id', openSession.id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (updateError) {
      const msg = updateError.message || 'Failed to close session'
      const code = updateError.code
      const lower = msg.toLowerCase()
      if (
        code === '42501' ||
        lower.includes('permission denied') ||
        lower.includes('row-level security') ||
        lower.includes('rls') ||
        lower.includes('policy')
      ) {
        return NextResponse.json({ error: 'Permission denied by RLS', details: msg, code }, { status: 403 })
      }
      return NextResponse.json({ error: 'Failed to close session', details: msg, code }, { status: 500 })
    }

    const formatted = {
      id: updated.id,
      status: updated.status,
      openingAmount: updated.opening_amount,
      closingAmount: updated.closing_amount,
      openedAt: updated.opened_at,
      closedAt: updated.closed_at,
      notes: updated.notes,
      closedByUser: { id: user.id }
    }

    return NextResponse.json({ session: formatted })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to close cash session', message: error?.message || String(error) }, { status: 500 })
  }
}
