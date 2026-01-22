import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = await createServerClient(cookieStore)

    const { data: { user }, error: authError } = await (supabase as any).auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: session, error: sesErr } = await (supabase as any)
      .from('cash_sessions')
      .select('id, opening_amount, status')
      .eq('id', sessionId)
      .single()
    if (sesErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: totals, error: movErr } = await (supabase as any)
      .from('cash_movements')
      .select('type, amount')
      .eq('session_id', sessionId)
    if (movErr) {
      return NextResponse.json({ error: 'Failed to fetch movements', details: movErr.message, code: movErr.code }, { status: 500 })
    }

    const summary = (totals || []).reduce((acc: any, m: any) => {
      const amt = Number(m.amount) || 0
      switch (String(m.type).toUpperCase()) {
        case 'IN': acc.in += Math.abs(amt); acc.net += Math.abs(amt); break
        case 'OUT': acc.out += Math.abs(amt); acc.net -= Math.abs(amt); break
        case 'SALE': acc.sale += Math.abs(amt); acc.net += Math.abs(amt); break
        case 'RETURN': acc.return += Math.abs(amt); acc.net -= Math.abs(amt); break
        case 'ADJUSTMENT': acc.adjustment += amt; acc.net += amt; break
      }
      return acc
    }, { in: 0, out: 0, sale: 0, return: 0, adjustment: 0, net: 0 })

    const currentBalance = Number(session.opening_amount || 0) + summary.net

    return NextResponse.json({
      session: { id: session.id, status: session.status, openingAmount: session.opening_amount },
      summary,
      currentBalance
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to compute balance', message: error?.message || String(error) }, { status: 500 })
  }
}

