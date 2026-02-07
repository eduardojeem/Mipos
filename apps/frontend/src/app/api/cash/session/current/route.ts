import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const canUseSupabase = typeof (supabase as any)?.from === 'function';
    const { data: { user }, error: authError } = await (supabase as any).auth.getUser?.() || { data: { user: null }, error: new Error('No auth') };

    if (!canUseSupabase || authError) {
      // Entorno sin Supabase configurado: devolver sesión nula para mantener la UI estable
      return NextResponse.json({ session: null }, { status: 200 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization ID from header
    const orgId = request.headers.get('x-organization-id');
    if (!orgId) {
      // Si no hay organización seleccionada, devolver null para mantener UI estable
      return NextResponse.json({ session: null }, { status: 200 });
    }

    // Try to find any open session considering both status column variants
    const { data, error } = await (supabase as any)
      .from('cash_sessions')
      .select('id, user_id, opened_by, status, opening_amount, closing_amount, opening_time, closing_time, notes, organization_id')
      .or('status.eq.open,status.eq.OPEN')
      .eq('organization_id', orgId)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch session', details: error.message, code: error.code }, { status: 500 });
    }

    const session = Array.isArray(data) ? data[0] : null;
    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    // Normalize response fields
    const normalized = {
      id: session.id,
      status: session.status ?? null,
      openingAmount: session.opening_amount ?? null,
      closingAmount: session.closing_amount ?? null,
      openedAt: session.opening_time ?? null,
      closedAt: session.closing_time ?? null,
      notes: session.notes ?? null,
    };

    return NextResponse.json({ session: normalized }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: e?.message || String(e) }, { status: 500 });
  }
}
