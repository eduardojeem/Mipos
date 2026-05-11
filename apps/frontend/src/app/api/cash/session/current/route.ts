import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichCashSessions, fetchOpenCashSession } from '@/app/api/cash/_lib/session-summary';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { SupabaseClient } from '@supabase/supabase-js';

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
        };
        Insert: Record<string, unknown>;
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

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBasicCashSessionPayload(session: {
  id: string;
  status?: string | null;
  opening_amount?: number | string | null;
  closing_amount?: number | string | null;
  system_expected?: number | string | null;
  discrepancy_amount?: number | string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  notes?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
}) {
  const openingAmount = toNumber(session.opening_amount);
  const closingAmount = session.closing_amount != null ? toNumber(session.closing_amount) : null;
  const systemExpected = session.system_expected != null ? toNumber(session.system_expected) : openingAmount;
  const discrepancyAmount =
    session.discrepancy_amount != null ? toNumber(session.discrepancy_amount) : null;

  return {
    id: session.id,
    status: String(session.status || 'UNKNOWN').toUpperCase(),
    openingAmount,
    closingAmount,
    systemExpected,
    discrepancyAmount,
    openedAt: session.opened_at ?? null,
    closedAt: session.closed_at ?? null,
    notes: session.notes ?? null,
    branchId: session.branch_id ?? null,
    posId: session.pos_id ?? null,
    openedByUser: null,
    closedByUser: null,
    counts: [],
    movements: [],
    summary: {
      movementCount: 0,
      movementTypeCounts: {
        IN: 0,
        OUT: 0,
        SALE: 0,
        RETURN: 0,
        ADJUSTMENT: 0,
      },
      lastMovementAt: null,
      totalSold: 0,
      totalRefunded: 0,
      salesCount: 0,
      returnsCount: 0,
      manualIn: 0,
      manualOut: 0,
      cashSales: 0,
      refunds: 0,
      adjustments: 0,
      netCashFlow: 0,
      expectedCash: systemExpected,
      actualCash: closingAmount,
      differenceAmount: discrepancyAmount,
      paymentMethods: [],
      refundMethods: [],
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as SupabaseClient<ExtendedDatabase>;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let organizationId = (request.headers.get('x-organization-id') || '').trim();
    if (!organizationId) {
      const { getUserOrganizationId } = await import('@/app/api/_utils/organization');
      const resolved = await getUserOrganizationId(user.id);
      if (resolved) organizationId = resolved;
    }

    if (!organizationId) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    const operationalContext = getRequestOperationalContext(request);
    const session = await fetchOpenCashSession(supabase, organizationId, operationalContext);
    if (!session) {
      return NextResponse.json({ session: null }, { status: 200 });
    }

    try {
      const [enrichedSession] = await enrichCashSessions(
        supabase,
        organizationId,
        [session as unknown as Parameters<typeof enrichCashSessions>[2][number]],
        { recentMovementsLimit: 6 },
      );

      return NextResponse.json({ session: enrichedSession ?? null }, { status: 200 });
    } catch (error: unknown) {
      console.error('[cash/session/current] Failed to enrich session, returning basic payload:', error);
      return NextResponse.json(
        { session: toBasicCashSessionPayload(session) },
        { status: 200 },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cash/session/current] Failed to load current session:', error);
    return NextResponse.json(
      { session: null, error: 'Unexpected error', details: message },
      { status: 200 },
    );
  }
}
