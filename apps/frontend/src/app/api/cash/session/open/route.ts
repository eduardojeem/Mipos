import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';

// Local extension for missing tables in generated types
type ExtendedDatabase = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          organization_id: string | null;
          is_active: boolean | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
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
        Insert: {
          opened_by: string;
          opening_amount: number;
          status: string;
          opened_at: string;
          notes: string | null;
          organization_id: string;
          branch_id?: string | null;
          pos_id?: string | null;
        };
        Update: {
          closing_amount?: number | null;
          status?: string;
          closed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
import { findOpenCashSessionConflict } from '@/app/api/cash/_lib/session-summary';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { validateRole } from '@/app/api/_utils/role-validation';
import { validateOrganizationAccess, getUserOrganizationId } from '@/app/api/_utils/organization';
import { logAudit } from '@/app/api/admin/_utils/audit';
import { createAdminClient } from '@/lib/supabase-admin';
import { MAX_CASH_OPENING_AMOUNT } from '@/lib/cash/constants';

function resolveBackendBase() {
  return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
}

const OPERATIONAL_ID_PATTERN = /^[A-Za-z0-9:_-]{1,120}$/;

function normalizeOperationalId(value: string | null | undefined, label: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!OPERATIONAL_ID_PATTERN.test(trimmed)) {
    throw new Error(`Invalid ${label}`);
  }
  return trimmed;
}

function isMissingRelationError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();
  const details = String((error as { details?: unknown } | null)?.details ?? '').toLowerCase();
  return (
    message.includes('relation') ||
    message.includes('table') ||
    details.includes('relation') ||
    details.includes('table')
  );
}

function isMissingColumnError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();
  const details = String((error as { details?: unknown } | null)?.details ?? '').toLowerCase();
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (details.includes('column') && details.includes('does not exist'))
  );
}

function isDuplicateOpenSessionError(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code ?? '').toUpperCase();
  const message = String((error as { message?: unknown } | null)?.message ?? '').toLowerCase();
  return (
    code === '23505' ||
    (message.includes('duplicate key') && message.includes('cash_sessions')) ||
    (message.includes('unique') && message.includes('cash_sessions'))
  );
}

function describeConflictScope(session: {
  id: string;
  opened_at?: string | null;
  branch_id?: string | null;
  pos_id?: string | null;
}) {
  const branchId = session.branch_id?.trim() || null;
  const posId = session.pos_id?.trim() || null;
  const scope = posId ? 'POS' : branchId ? 'BRANCH' : 'GLOBAL';

  return {
    id: session.id,
    openedAt: session.opened_at ?? null,
    branchId,
    posId,
    scope,
  };
}

async function validateOperationalContextForOpen(
  client: SupabaseClient<ExtendedDatabase> | null,
  organizationId: string,
  context: { branchId: string | null; posId: string | null },
) {
  const branchId = normalizeOperationalId(context.branchId, 'branch id');
  const posId = normalizeOperationalId(context.posId, 'pos id');

  if (branchId && client && typeof client.from === 'function') {
    const { data, error } = await client
      .from('branches')
      .select('id, organization_id, is_active')
      .eq('id', branchId)
      .maybeSingle();

    if (error) {
      if (!isMissingRelationError(error) && !isMissingColumnError(error)) {
        throw new Error(error.message || 'Failed to validate branch');
      }
    } else {
      if (!data) {
        throw new Error('Selected branch does not exist');
      }

      if (data.organization_id && data.organization_id !== organizationId) {
        throw new Error('Selected branch does not belong to the current organization');
      }

      if (data.is_active === false) {
        throw new Error('Selected branch is inactive');
      }
    }
  }

  return { branchId, posId };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const openingAmount = Number(body?.openingAmount);
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : undefined;

    const headerOrgId = (request.headers.get('x-organization-id') || '').trim();
    let organizationId = headerOrgId;

    if (!Number.isFinite(openingAmount) || openingAmount < 0 || openingAmount > MAX_CASH_OPENING_AMOUNT) {
      return NextResponse.json({ error: 'Invalid opening amount' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    const { data: { user }, error: authError } =
      (await supabase.auth.getUser()) ||
      { data: { user: null }, error: new Error('No auth') };

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!organizationId && user?.id) {
      const resolvedOrgId = await getUserOrganizationId(user.id);
      if (resolvedOrgId) {
        organizationId = resolvedOrgId;
      }
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const roleValidation = await validateRole(request, {
      roles: ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'SELLER'],
      permissions: ['cash.open'],
      requireAllPermissions: true,
    });

    if (!roleValidation.ok) {
      return NextResponse.json(roleValidation.body, { status: roleValidation.status });
    }

    // Usamos el userId validado
    const validatedUserId = roleValidation.userId || user.id;

    if (roleValidation.userRole !== 'SUPER_ADMIN') {
      const hasOrganizationAccess = await validateOrganizationAccess(validatedUserId, organizationId);
      if (!hasOrganizationAccess) {
        return NextResponse.json({ error: 'Access denied to selected organization' }, { status: 403 });
      }
    }

    const canUseSupabase = typeof supabase.from === 'function';
    const { data: { session } } =
      (await supabase.auth.getSession()) ||
      { data: { session: null } };


    let adminClient: SupabaseClient<ExtendedDatabase> | null = null;
    try {
      adminClient = createAdminClient();
    } catch {
      adminClient = null;
    }

    const operationalContext = await validateOperationalContextForOpen(
      adminClient ?? (canUseSupabase ? supabase : null),
      organizationId,
      getRequestOperationalContext(request, body),
    );

    const backendBase = resolveBackendBase();
    if (backendBase && session?.access_token) {
      try {
        const backendResponse = await fetch(`${backendBase}/cash/session/open`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            'x-organization-id': organizationId,
            ...(operationalContext.branchId ? { 'x-branch-id': operationalContext.branchId } : {}),
            ...(operationalContext.posId ? { 'x-pos-id': operationalContext.posId, 'x-register-id': operationalContext.posId } : {}),
          },
          body: JSON.stringify({
            openingAmount,
            notes,
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
    let writer: SupabaseClient<ExtendedDatabase> | null =
      (adminClient as unknown as SupabaseClient<ExtendedDatabase> | null) ??
      (canUseSupabase ? (supabase as unknown as SupabaseClient<ExtendedDatabase>) : null);

    if (!writer && supabaseUrl && serviceRoleKey) {
      writer = createServiceClient(supabaseUrl, serviceRoleKey);
    }

    if (!writer) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const existingOpenSession = await findOpenCashSessionConflict(writer, organizationId, operationalContext);
    if (existingOpenSession) {
      return NextResponse.json(
        {
          error: 'There is already an open cash session',
          conflict: describeConflictScope(existingOpenSession),
        },
        { status: 400 },
      );
    }

    const sessionPayload = {
      opened_by: user.id,
      opening_amount: openingAmount,
      status: 'OPEN',
      opened_at: new Date().toISOString(),
      notes: notes || null,
      organization_id: organizationId,
      branch_id: operationalContext.branchId,
      pos_id: operationalContext.posId,
    };

    let insertResult = await writer
      .from('cash_sessions')
      .insert(sessionPayload)
      .select('*')
      .single();

    if (insertResult.error && String(insertResult.error.message || '').toLowerCase().includes('column')) {
      insertResult = await writer
        .from('cash_sessions')
        .insert({
          opened_by: user.id,
          opening_amount: openingAmount,
          status: 'OPEN',
          opened_at: new Date().toISOString(),
          notes: notes || null,
          organization_id: organizationId,
        })
        .select('*')
        .single();
    }

    const { data, error } = insertResult as unknown as {
      data: ExtendedDatabase['public']['Tables']['cash_sessions']['Row'];
      error: { message: string; code?: string } | null;
    };

    if (error) {
      if (isDuplicateOpenSessionError(error)) {
        return NextResponse.json(
          { error: 'There is already an open cash session' },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to create session',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    logAudit('cash.session.opened', {
      entityType: 'CashSession',
      entityId: data.id,
      sessionId: data.id,
      organizationId,
      branchId: data.branch_id ?? operationalContext.branchId,
      posId: data.pos_id ?? operationalContext.posId,
      source: 'frontend-fallback',
      newData: {
        opening_amount: Number(data.opening_amount || 0),
        status: data.status,
      },
    });

    return NextResponse.json({
      session: {
        id: data.id,
        status: data.status,
        openingAmount: Number(data.opening_amount || 0),
        closingAmount: data.closing_amount != null ? Number(data.closing_amount) : null,
        openedAt: data.opened_at,
        closedAt: data.closed_at ?? null,
        notes: data.notes ?? null,
        branchId: data.branch_id ?? operationalContext.branchId,
        posId: data.pos_id ?? operationalContext.posId,
        openedByUser: { id: user.id },
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message;
    const lowerMessage = message.toLowerCase();
    const status =
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('selected branch')
        ? 400
        : 500;

    return NextResponse.json(
      { error: 'Failed to open cash session', message },
      { status },
    );
  }
}
