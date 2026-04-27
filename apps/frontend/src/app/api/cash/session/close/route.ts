import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import {
  enrichCashSessions,
  fetchCashSessionById,
  fetchOpenCashSession,
} from '@/app/api/cash/_lib/session-summary';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { validateRole } from '@/app/api/_utils/role-validation';
import { validateOrganizationAccess, getUserOrganizationId } from '@/app/api/_utils/organization';

type ExtendedDatabase = {
  public: {
    Tables: {
      cash_sessions: {
        Row: {
          id: string;
          organization_id: string;
          opened_by: string;
          closed_by: string | null;
          opening_amount: number;
          closing_amount: number | null;
          status: string;
          notes: string | null;
          opened_at: string;
          closed_at: string | null;
          branch_id: string | null;
          pos_id: string | null;
          discrepancy_amount: number | null;
          system_expected: number | null;
        };
        Insert: Record<string, unknown>;
        Update: {
          closing_amount?: number | null;
          closed_at?: string | null;
          closed_by?: string | null;
          status?: string;
          system_expected?: number | null;
          discrepancy_amount?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      cash_counts: {
        Row: {
          id: string;
          session_id: string;
          organization_id: string;
          denomination: number;
          quantity: number;
          total: number;
        };
        Insert: {
          session_id: string;
          organization_id: string;
          denomination: number;
          quantity: number;
          total: number;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      cash_discrepancies: {
        Row: Record<string, unknown>;
        Insert: {
          session_id: string;
          organization_id: string;
          type: 'SHORTAGE' | 'OVERAGE';
          amount: number;
          explanation: string | null;
          reported_by: string;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function resolveBackendBase() {
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const operationalContext = getRequestOperationalContext(request, body);
    const closingAmount = Number(body?.closingAmount);
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : undefined;
    const counts = Array.isArray(body?.counts) ? body.counts : undefined;

    const cookieStore = await cookies();
    const supabase = (await createServerClient(cookieStore)) as SupabaseClient<ExtendedDatabase>;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let organizationId = (request.headers.get('x-organization-id') || '').trim();
    if (!organizationId) {
      const resolved = await getUserOrganizationId(user.id);
      if (resolved) organizationId = resolved;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    if (!Number.isFinite(closingAmount) || closingAmount < 0) {
      return NextResponse.json({ error: 'Invalid closing amount' }, { status: 400 });
    }

    const roleValidation = await validateRole(request, {
      roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'SELLER'],
      permissions: ['cash.close'],
      requireAllPermissions: true,
    });

    if (!roleValidation.ok) {
      return NextResponse.json(roleValidation.body, { status: roleValidation.status });
    }

    if (roleValidation.userId && roleValidation.userRole !== 'SUPER_ADMIN') {
      const hasOrganizationAccess = await validateOrganizationAccess(roleValidation.userId, organizationId);
      if (!hasOrganizationAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 });
      }
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();

    const openSession = await fetchOpenCashSession(supabase, organizationId, operationalContext);
    if (!openSession) {
      return NextResponse.json({ error: 'No open session' }, { status: 404 });
    }

    const [sessionWithSummary] = await enrichCashSessions(
      supabase,
      organizationId,
      [openSession as unknown as Parameters<typeof enrichCashSessions>[2][number]],
      { recentMovementsLimit: 6 },
    );

    const systemExpected = Number(
      body?.systemExpected ?? sessionWithSummary?.summary?.expectedCash ?? sessionWithSummary?.systemExpected ?? 0,
    );

    const backendBase = resolveBackendBase();
    if (backendBase && authSession?.access_token) {
      try {
        const backendResponse = await fetch(`${backendBase}/cash/session/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
            'x-organization-id': organizationId,
            ...(operationalContext.branchId ? { 'x-branch-id': operationalContext.branchId } : {}),
            ...(operationalContext.posId ? { 'x-pos-id': operationalContext.posId, 'x-register-id': operationalContext.posId } : {}),
          },
          body: JSON.stringify({
            closingAmount,
            notes,
            counts,
            systemExpected,
            branchId: operationalContext.branchId ?? undefined,
            posId: operationalContext.posId ?? undefined,
          }),
        });

        const contentType = backendResponse.headers.get('content-type') || '';
        if (backendResponse.ok && contentType.includes('application/json')) {
          const payload = await backendResponse.json();
          return NextResponse.json(payload, { status: backendResponse.status });
        }

        if ([400, 401, 403].includes(backendResponse.status)) {
          const payload = contentType.includes('application/json')
            ? await backendResponse.json()
            : { error: await backendResponse.text() };
          return NextResponse.json(payload, { status: backendResponse.status });
        }
      } catch {
        // Fall back to direct Supabase mutation below.
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let writer = supabase;

    if (supabaseUrl && serviceRoleKey) {
      writer = createServiceClient<ExtendedDatabase>(supabaseUrl, serviceRoleKey) as unknown as typeof supabase;
    }

    if (counts && counts.length > 0) {
      await writer
        .from('cash_counts')
        .delete()
        .eq('session_id', openSession.id)
        .eq('organization_id', organizationId);

      const sanitizedCounts = counts
        .map((count: { denomination?: number; quantity?: number; total?: number }) => ({
          session_id: openSession.id,
          organization_id: organizationId,
          denomination: Number(count?.denomination || 0),
          quantity: Number(count?.quantity || 0),
          total: Number(count?.total || (Number(count?.denomination || 0) * Number(count?.quantity || 0))),
        }))
        .filter((count: { denomination: number; quantity: number }) => count.quantity > 0 && count.denomination >= 0);

      if (sanitizedCounts.length > 0) {
        const { error: countError } = await writer.from('cash_counts').insert(sanitizedCounts);
        if (countError) {
          return NextResponse.json(
            { error: 'Failed to save cash count', details: countError.message },
            { status: 500 },
          );
        }
      }
    }

    const discrepancyAmount = closingAmount - systemExpected;

    const { error: updateError } = await writer
      .from('cash_sessions')
      .update({
        closing_amount: closingAmount,
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        status: 'CLOSED',
        system_expected: systemExpected,
        discrepancy_amount: discrepancyAmount,
        notes: notes || openSession.notes || null,
      })
      .eq('id', openSession.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to close session', details: updateError.message, code: updateError.code },
        { status: 500 },
      );
    }

    if (Math.abs(discrepancyAmount) > 0.009) {
      await writer.from('cash_discrepancies').insert({
        session_id: openSession.id,
        organization_id: organizationId,
        type: discrepancyAmount < 0 ? 'SHORTAGE' : 'OVERAGE',
        amount: Math.abs(discrepancyAmount),
        explanation: notes || null,
        reported_by: user.id,
      });
    }

    const closedSession = await fetchCashSessionById(writer, organizationId, openSession.id);
    if (!closedSession) {
      return NextResponse.json({ session: null });
    }

    const [enrichedClosedSession] = await enrichCashSessions(
      writer,
      organizationId,
      [closedSession],
      { recentMovementsLimit: 6 },
    );

    return NextResponse.json({ session: enrichedClosedSession });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to close cash session', message },
      { status: 500 },
    );
  }
}
