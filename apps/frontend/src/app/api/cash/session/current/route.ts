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

    const [enrichedSession] = await enrichCashSessions(
      supabase,
      organizationId,
      [session as unknown as Parameters<typeof enrichCashSessions>[2][number]],
      { recentMovementsLimit: 6 },
    );

    return NextResponse.json({ session: enrichedSession ?? null }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Unexpected error', details: message },
      { status: 500 },
    );
  }
}
