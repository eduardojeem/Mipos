import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';

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

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const cookieStore = await cookies();
        const supabase = await createServerClient(cookieStore);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

    let query = supabase.from('cash_movements').select('*').eq('organization_id', orgId);

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }
        if (type) {
            query = query.eq('type', type);
        }
        if (referenceType) {
            query = query.eq('reference_type', referenceType);
        }
        if (referenceId) {
            query = query.eq('reference_id', referenceId);
        }
        if (createdByMe && user?.id) {
            query = query.eq('created_by', user.id);
        }
        const normalizeDate = (v: string | null, endOfDay: boolean) => {
            if (!v) return undefined as unknown as string;
            if (v.includes('T')) return v;
            return `${v}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`;
        };
        let from = rawFrom ? normalizeDate(rawFrom, false) : undefined;
        let to = rawTo ? normalizeDate(rawTo, true) : undefined;
        if (sessionId && to) {
            try {
                const { data: ses } = await supabase
                    .from('cash_sessions')
                    .select('closed_at')
                    .eq('id', sessionId)
                    .eq('organization_id', orgId)
                    .single();
                if (ses?.closed_at && new Date(ses.closed_at) < new Date(to)) {
                    to = ses.closed_at;
                }
            } catch {}
        }
        if (from) {
            query = query.gte('created_at', from);
        }
        if (to) {
            query = query.lte('created_at', to);
        }
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

        const { data: movements, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching movements:', error);
            return NextResponse.json(
                { error: 'Failed to fetch movements', details: error.message },
                { status: 500 }
            );
        }

        // Fetch user profiles if needed
        let userProfiles: Record<string, any> = {};

        if (include === 'user' && movements && movements.length > 0) {
            const userIds = [...new Set(movements.map((m: any) => m.created_by).filter(Boolean))];

            if (userIds.length > 0) {
                // Try profiles, then users as fallback
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);
                let profilesData = profiles || [];
                if (profilesError || profilesData.length === 0) {
                    const { data: users } = await supabase
                        .from('users')
                        .select('id, full_name, email')
                        .in('id', userIds);
                    profilesData = users || [];
                }

                if (profilesData && profilesData.length > 0) {
                    profilesData.forEach((p: { id: string; full_name: string; email: string }) => {
                        userProfiles[p.id] = {
                            id: p.id,
                            fullName: p.full_name,
                            email: p.email
                        };
                    });
                }
            }
        }

        const formattedMovements = movements?.map((m: any) => ({
            id: m.id,
            sessionId: m.session_id,
            type: m.type,
            amount: m.amount,
            reason: m.reason,
            referenceType: m.reference_type,
            referenceId: m.reference_id,
            createdAt: m.created_at,
            createdByUser: m.created_by ? userProfiles[m.created_by] : null
        })) || [];

        return NextResponse.json({ movements: formattedMovements });
    } catch (error: any) {
        console.error('Error getting movements:', error);
        return NextResponse.json(
            { error: 'Failed to get movements', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, type, amount, reason, referenceType, referenceId } = body;

        // Validate required fields
        if (!sessionId || !type) {
            return NextResponse.json(
                { error: 'Missing required fields: sessionId and type are required' },
                { status: 400 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || !Number.isFinite(amount)) {
            return NextResponse.json(
                { error: 'Invalid amount: must be a finite number' },
                { status: 400 }
            );
        }

        if (amount === 0 && type !== 'SALE') {
            return NextResponse.json(
                { error: 'Amount cannot be zero for this movement type' },
                { status: 400 }
            );
        }

        if (Math.abs(amount) > 10000000) {
            return NextResponse.json(
                { error: 'Amount too large: maximum is $10,000,000' },
                { status: 400 }
            );
        }

        // Validate movement type
        const VALID_TYPES = ['IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT'];
        if (!VALID_TYPES.includes(type)) {
            return NextResponse.json(
                { error: `Invalid movement type: must be one of ${VALID_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        // Amount sign conventions
        // RETURN must be negative; ADJUSTMENT can be +/-; IN/OUT/SALE must be positive
        if (type === 'RETURN' && amount >= 0) {
            return NextResponse.json(
                { error: 'Return amount must be negative' },
                { status: 400 }
            );
        }
        if (type !== 'ADJUSTMENT' && type !== 'RETURN' && amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be positive for this movement type' },
                { status: 400 }
            );
        }

    const orgId = (request.headers.get('x-organization-id') || '').trim();
    if (!orgId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    const cookieStore = await cookies();
        const supabase = await createServerClient(cookieStore);

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Verify session exists and is open
    const { data: session, error: sessionError } = await supabase
            .from('cash_sessions')
            .select('id, status, organization_id')
            .eq('id', sessionId)
            .eq('organization_id', orgId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        if (session.status.toUpperCase() !== 'OPEN') {
            return NextResponse.json(
                { error: 'Session is not open' },
                { status: 400 }
            );
        }

        // Store amount with sign conventions (no normalization)
        const normalizedAmount = amount;

        // Prevent duplicate movement by reference
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

        // Create movement with user_id
    const { data: movement, error: insertError } = await supabase
            .from('cash_movements')
            .insert({
                session_id: sessionId,
                type,
                amount: Math.round(normalizedAmount * 100) / 100,
                reason: (typeof reason === 'string' ? reason.slice(0, 200).replace(/[\u0000-\u001F\u007F]/g, '') : null),
                reference_type: referenceType || null,
                reference_id: referenceId || null,
                created_by: user.id,
                organization_id: orgId
            })
            .select()
            .single();

    if (insertError) {
            const msg = insertError.message || 'Failed to create movement';
            const code = insertError.code;
            const lower = msg.toLowerCase();
            if (
              code === '42501' ||
              lower.includes('permission denied') ||
              lower.includes('row-level security') ||
              lower.includes('rls') ||
              lower.includes('policy')
            ) {
              return NextResponse.json(
                { error: 'Permission denied by RLS', details: msg, code },
                { status: 403 }
              );
            }
            console.error('Error creating movement:', insertError);
            return NextResponse.json(
                { error: 'Failed to create movement', details: msg, code },
                { status: 500 }
            );
        }

        // Fetch user profile for response
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', user.id)
            .single();

        const formattedMovement = {
            id: movement.id,
            sessionId: movement.session_id,
            type: movement.type,
            amount: movement.amount,
            reason: movement.reason,
            referenceType: movement.reference_type,
            referenceId: movement.reference_id,
            createdAt: movement.created_at,
            createdByUser: profile ? {
                id: profile.id,
                fullName: profile.full_name,
                email: profile.email
            } : { id: user.id }
        };

        return NextResponse.json({ movement: formattedMovement });
    } catch (error: any) {
        console.error('Error creating movement:', error);
        return NextResponse.json(
            { error: 'Failed to create movement', message: error.message },
            { status: 500 }
        );
    }
}
