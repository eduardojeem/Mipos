import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/cash/session/force-close
 * Cierra forzosamente todas las sesiones abiertas para la organización actual.
 * Se usa cuando el usuario quiere abrir una nueva caja pero hay una sesión huérfana.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : 'Cierre forzado';

    // Auth
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Resolve organization: header first, then from user membership
    let organizationId = (request.headers.get('x-organization-id') || '').trim();
    if (!organizationId) {
      const resolved = await getUserOrganizationId(user.id);
      if (resolved) organizationId = resolved;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
    }

    // Get a writer client (admin preferred for bypassing RLS)
    let writer: ReturnType<typeof createServiceClient> | ReturnType<typeof createAdminClient> | typeof supabase | null = null;
    try {
      writer = createAdminClient();
    } catch { /* ignore */ }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!writer && supabaseUrl && serviceRoleKey) {
      writer = createServiceClient(supabaseUrl, serviceRoleKey);
    }

    if (!writer && typeof supabase.from === 'function') {
      writer = supabase;
    }

    if (!writer) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Find all open sessions for this org
    const { data: openSessions, error: fetchError } = await writer
      .from('cash_sessions')
      .select('id, status, opened_at, branch_id, pos_id, opening_amount')
      .eq('organization_id', organizationId)
      .or('status.eq.OPEN,status.eq.open');

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to query sessions', details: fetchError.message },
        { status: 500 },
      );
    }

    if (!openSessions || openSessions.length === 0) {
      // No open sessions - that's fine, caller can proceed to open a new one
      return NextResponse.json({ closed: 0, message: 'No open sessions found' });
    }

    const now = new Date().toISOString();
    const sessionIds = openSessions.map((s: { id: string }) => s.id);

    // Close all open sessions
    const { error: updateError } = await writer
      .from('cash_sessions')
      .update({
        status: 'CLOSED',
        closed_at: now,
        closed_by: user.id,
        closing_amount: 0,
        notes: notes,
      })
      .eq('organization_id', organizationId)
      .in('id', sessionIds);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to close sessions', details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      closed: sessionIds.length,
      sessionIds,
      message: `${sessionIds.length} sesión(es) cerrada(s) forzosamente`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Force close failed', message },
      { status: 500 },
    );
  }
}
