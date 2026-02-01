import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { openingAmount, notes } = body;

        const orgId = (request.headers.get('x-organization-id') || '').trim();
        if (!orgId) {
            return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
        }

        if (typeof openingAmount !== 'number' || openingAmount < 0) {
            return NextResponse.json(
                { error: 'Invalid opening amount' },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();
        const supabase = await createServerClient(cookieStore);
        const canUseSupabase = typeof (supabase as any)?.from === 'function';

        // Get current user
        const { data: { user }, error: authError } = await (supabase as any).auth.getUser?.() || { data: { user: null }, error: new Error('No auth') };
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Build clients and check existing open session using available client (supabase or service role)
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!canUseSupabase && !(url && serviceKey)) {
            return NextResponse.json(
                { error: 'Supabase not configured' },
                { status: 503 }
            );
        }

        let svc: any = null;
        if (url && serviceKey) {
            try {
                svc = createServiceClient(url as string, serviceKey as string);
            } catch { }
        }

        const queryClient: any = canUseSupabase ? (supabase as any) : svc;
        const { data: existingSessions, error: checkError } = await queryClient
            .from('cash_sessions')
            .select('id')
            .or('status.eq.open,status.eq.OPEN')
            .eq('organization_id', orgId)
            .limit(1);

        if (checkError) {
            console.warn('Warning checking existing cash session:', checkError.message);
        }

        if (Array.isArray(existingSessions) && existingSessions.length > 0) {
            return NextResponse.json(
                { error: 'There is already an open cash session' },
                { status: 400 }
            );
        }

        // Insert new session, handling schema variants
        let session: any = null;
        if (svc) {
            const insertRes = await svc
                .from('cash_sessions')
                .insert({
                    user_id: user.id,
                    opened_by: user.id,
                    opening_amount: openingAmount,
                    status: 'OPEN',
                    opening_time: new Date().toISOString(),
                    notes: notes || null,
                    organization_id: orgId
                })
                .select()
                .single();
            if (insertRes.error) {
                const msg = insertRes.error.message || 'Failed to create session';
                const code = insertRes.error.code;
                const lower = msg.toLowerCase();
                if (code === '42501' || lower.includes('permission denied')) {
                    return NextResponse.json(
                        { error: 'Permission denied by RLS', details: msg, code },
                        { status: 403 }
                    );
                }
                return NextResponse.json(
                    { error: 'Failed to create session', details: msg, code },
                    { status: 500 }
                );
            }
            session = insertRes.data;
        } else {
            const insertRes = await (supabase as any)
                .from('cash_sessions')
                .insert({
                    user_id: user.id,
                    opened_by: user.id,
                    opening_amount: openingAmount,
                    status: 'OPEN',
                    opening_time: new Date().toISOString(),
                    notes: notes || null,
                    organization_id: orgId
                })
                .select()
                .single();
            if (insertRes.error) {
                const msg = insertRes.error.message || 'Failed to create session';
                const code = insertRes.error.code;
                const lower = msg.toLowerCase();
                if (code === '42501' || lower.includes('permission denied')) {
                    return NextResponse.json(
                        { error: 'Permission denied by RLS', details: msg, code },
                        { status: 403 }
                    );
                }
                return NextResponse.json(
                    { error: 'Failed to create session', details: msg, code },
                    { status: 500 }
                );
            }
            session = insertRes.data;
        }

        // Get user profile for response (profile table can vary; fallback to auth user)
        let openedByUser: any = { id: user.id };
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('id', user.id)
                .single();
            if (profile) {
                openedByUser = { id: profile.id, fullName: profile.full_name, email: profile.email };
            }
        } catch { }

        // Transform to camelCase for frontend
        const formattedSession = {
            id: session.id,
            status: session.status,
            openingAmount: session.opening_amount,
            closingAmount: session.closing_amount ?? null,
            openedAt: session.opening_time,
            closedAt: session.closed_at ?? null,
            notes: session.notes,
            openedByUser
        };

        return NextResponse.json({ session: formattedSession });
    } catch (error: any) {
        console.error('Error in cash session open:', error);
        return NextResponse.json(
            { error: 'Failed to open cash session', message: error.message },
            { status: 500 }
        );
    }
}
