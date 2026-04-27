import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { getRequestOperationalContext } from '@/app/api/_utils/operational-context';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { SupabaseClient } from '@supabase/supabase-js';

type ExtendedDatabase = {
  public: {
    Tables: {
      cash_sessions: {
        Row: {
          id: string;
          status: string;
          organization_id: string;
          closed_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      cash_movements: {
        Row: {
          id: string;
          session_id: string;
          type: string;
          amount: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_at: string;
          created_by: string;
          organization_id: string;
          branch_id: string | null;
          pos_id: string | null;
        };
        Insert: {
          session_id: string;
          type: string;
          amount: number;
          reason: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          created_by: string;
          organization_id: string;
          branch_id?: string | null;
          pos_id?: string | null;
        };
        Update: Record<string, unknown>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
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

type CashSessionRow = ExtendedDatabase['public']['Tables']['cash_sessions']['Row'];
type CashMovementRow = ExtendedDatabase['public']['Tables']['cash_movements']['Row'];
type ProfileRow = ExtendedDatabase['public']['Tables']['profiles']['Row'];

function resolveBackendBase() {
    return (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        const include = url.searchParams.get('include');
        const type = url.searchParams.get('type');
        const rawFrom = url.searchParams.get('from');
        const rawTo = url.searchParams.get('to');
        const search = url.searchParams.get('search');
        const amountMin = url.searchParams.get('amountMin');
        const amountMax = url.searchParams.get('amountMax');
        const referenceType = url.searchParams.get('referenceType');
        const referenceId = url.searchParams.get('referenceId');
        const createdByMe = url.searchParams.get('createdByMe');
        const userIdFilter = url.searchParams.get('userId');
        const orderBy = (url.searchParams.get('orderBy') || 'date').toLowerCase();
        const orderDir = (url.searchParams.get('orderDir') || 'desc').toLowerCase();
        const usePagination = url.searchParams.has('page') || url.searchParams.has('limit');
        const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
        const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));

        const cookieStore = await cookies();
        const supabase = (await createServerClient(cookieStore)) as SupabaseClient<ExtendedDatabase>;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        let orgId = (request.headers.get('x-organization-id') || '').trim();
        if (!orgId) {
            const resolved = await getUserOrganizationId(user.id);
            if (resolved) orgId = resolved;
        }

        if (!orgId || orgId === 'undefined') {
            return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
        }

        const baseQuery = supabase.from('cash_movements');
        let query = usePagination
            ? baseQuery.select('*', { count: 'exact' }).eq('organization_id', orgId)
            : baseQuery.select('*').eq('organization_id', orgId);

        if (sessionId) query = query.eq('session_id', sessionId);
        if (type) query = query.eq('type', type);
        if (referenceType) query = query.eq('reference_type', referenceType);
        if (referenceId) query = query.eq('reference_id', referenceId);
        if (createdByMe && user.id) query = query.eq('created_by', user.id);
        if (!createdByMe && userIdFilter && userIdFilter !== 'all') query = query.eq('created_by', userIdFilter);

        const normalizeDate = (v: string | null, endOfDay: boolean) => {
            if (!v) return undefined;
            if (v.includes('T')) return v;
            return `${v}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`;
        };

        const from = rawFrom ? normalizeDate(rawFrom, false) : undefined;
        let to = rawTo ? normalizeDate(rawTo, true) : undefined;

        if (sessionId && to) {
            const { data: ses } = await supabase
                .from('cash_sessions')
                .select('closed_at')
                .eq('id', sessionId)
                .eq('organization_id', orgId)
                .single();
            if (ses?.closed_at && new Date(ses.closed_at) < new Date(to)) {
                to = ses.closed_at;
            }
        }

        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);
        if (amountMin) {
            const v = Number(amountMin);
            if (!Number.isNaN(v)) query = query.gte('amount', v);
        }
        if (amountMax) {
            const v = Number(amountMax);
            if (!Number.isNaN(v)) query = query.lte('amount', v);
        }
        if (search && search.trim().length > 0) {
            query = query.ilike('reason', `%${search}%`);
        }

        const orderColumn = orderBy === 'amount' ? 'amount' : orderBy === 'type' ? 'type' : 'created_at';
        query = query.order(orderColumn, { ascending: orderDir === 'asc' });

        if (usePagination) {
            const start = (page - 1) * limit;
            const end = start + limit - 1;
            query = query.range(start, end);
        }

        const { data: movementsData, error, count } = await query;
        const movements = movementsData as unknown as CashMovementRow[];

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch movements', details: error.message }, { status: 500 });
        }

        const userProfiles: Record<string, { id: string; fullName: string | null; email: string | null }> = {};
        if (include === 'user' && movements && movements.length > 0) {
            const userIds = [...new Set(movements.map((m: CashMovementRow) => m.created_by).filter(Boolean))];
            if (userIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
                let profilesData = (profiles || []) as ProfileRow[];
                if (profilesData.length === 0) {
                    const { data: users } = await supabase
                      .from('users')
                      .select('id, full_name, email, organization_id')
                      .in('id', userIds)
                      .eq('organization_id', orgId);
                    profilesData = (users || []) as ProfileRow[];
                }
                profilesData.forEach((p: ProfileRow) => {
                    userProfiles[p.id] = { id: p.id, fullName: p.full_name, email: p.email };
                });
                // Fallback: ensure current user is present
                if (user && user.email && !userProfiles[user.id]) {
                    userProfiles[user.id] = { id: user.id, fullName: (user.user_metadata as any)?.full_name || null, email: user.email };
                }
            }
        }

        const formattedMovements = movements?.map((m: CashMovementRow) => ({
            id: m.id,
            sessionId: m.session_id,
            type: m.type,
            amount: m.amount,
            reason: m.reason,
            referenceType: m.reference_type,
            referenceId: m.reference_id,
            createdAt: m.created_at,
            createdBy: m.created_by || null,
            createdByUser: m.created_by ? userProfiles[m.created_by] : null
        })) || [];

        if (usePagination) {
            const total = typeof count === 'number' ? count : formattedMovements.length;
            return NextResponse.json({
                movements: formattedMovements,
                pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
            });
        }
        return NextResponse.json({ movements: formattedMovements });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Failed to get movements', message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const operationalContext = getRequestOperationalContext(request, body);
        const { sessionId, type, amount, reason, referenceType, referenceId } = body;

        if (!sessionId || !type) {
            return NextResponse.json({ error: 'Missing required fields: sessionId and type are required' }, { status: 400 });
        }
        if (typeof amount !== 'number' || !Number.isFinite(amount)) {
            return NextResponse.json({ error: 'Invalid amount: must be a finite number' }, { status: 400 });
        }
        if (amount === 0 && type !== 'SALE') {
            return NextResponse.json({ error: 'Amount cannot be zero for this movement type' }, { status: 400 });
        }

        const VALID_TYPES = ['IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT'];
        if (!VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: `Invalid movement type: must be one of ${VALID_TYPES.join(', ')}` }, { status: 400 });
        }

        if (type === 'RETURN' && amount >= 0) {
            return NextResponse.json({ error: 'Return amount must be negative' }, { status: 400 });
        }
        if (type !== 'ADJUSTMENT' && type !== 'RETURN' && amount <= 0) {
            return NextResponse.json({ error: 'Amount must be positive for this movement type' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = (await createServerClient(cookieStore)) as SupabaseClient<ExtendedDatabase>;

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        let orgId = (request.headers.get('x-organization-id') || '').trim();
        if (!orgId) {
            const resolved = await getUserOrganizationId(user.id);
            if (resolved) orgId = resolved;
        }

        if (!orgId || orgId === 'undefined') {
            return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
        }

        const backendBase = resolveBackendBase();
        if (backendBase && authSession?.access_token) {
            try {
                const backendResponse = await fetch(`${backendBase}/cash/movements`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authSession.access_token}`,
                        'x-organization-id': orgId,
                        ...(operationalContext.branchId ? { 'x-branch-id': operationalContext.branchId } : {}),
                        ...(operationalContext.posId ? { 'x-pos-id': operationalContext.posId, 'x-register-id': operationalContext.posId } : {}),
                    },
                    body: JSON.stringify({ sessionId, type, amount, reason, referenceType, referenceId, branchId: operationalContext.branchId, posId: operationalContext.posId }),
                });

                const contentType = backendResponse.headers.get('content-type') || '';
                if (backendResponse.ok && contentType.includes('application/json')) {
                    const payload = await backendResponse.json();
                    return NextResponse.json(payload, { status: backendResponse.status });
                }
            } catch { /* ignore and fallback */ }
        }

        const { data: sessionData, error: sessionError } = await supabase
            .from('cash_sessions')
            .select('id, status, organization_id')
            .eq('id', sessionId)
            .eq('organization_id', orgId)
            .single();
        
        const session = sessionData as unknown as CashSessionRow;

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        if (session.status.toUpperCase() !== 'OPEN') {
            return NextResponse.json({ error: 'Session is not open' }, { status: 400 });
        }

        if (referenceType && referenceId) {
            const { data: existing } = await supabase
                .from('cash_movements')
                .select('id')
                .eq('session_id', sessionId)
                .eq('reference_type', referenceType)
                .eq('reference_id', referenceId)
                .limit(1);
            if (Array.isArray(existing) && existing.length > 0) {
                return NextResponse.json({ message: 'Movement already exists' }, { status: 200 });
            }
        }

        const { data: movementData, error: insertError } = await supabase
            .from('cash_movements')
            .insert({
                session_id: sessionId,
                type,
                amount: Math.round(amount * 100) / 100,
                reason: (typeof reason === 'string' ? reason.slice(0, 200) : null),
                reference_type: referenceType || null,
                reference_id: referenceId || null,
                created_by: user.id,
                organization_id: orgId,
                branch_id: operationalContext.branchId,
                pos_id: operationalContext.posId,
            })
            .select()
            .single();

        const movement = movementData as unknown as CashMovementRow;

        if (insertError) {
            return NextResponse.json({ error: 'Failed to create movement', details: insertError.message }, { status: 500 });
        }

        const { data: profile } = await supabase.from('profiles').select('id, full_name, email').eq('id', user.id).single();

        return NextResponse.json({
            movement: {
                id: movement.id,
                sessionId: movement.session_id,
                type: movement.type,
                amount: movement.amount,
                reason: movement.reason,
                referenceType: movement.reference_type,
                referenceId: movement.reference_id,
                createdAt: movement.created_at,
                branchId: movement.branch_id ?? operationalContext.branchId,
                posId: movement.pos_id ?? operationalContext.posId,
                createdByUser: profile ? { id: profile.id, fullName: profile.full_name, email: profile.email } : { id: user.id }
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Failed to create movement', message }, { status: 500 });
    }
}
