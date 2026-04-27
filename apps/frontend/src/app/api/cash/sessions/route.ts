import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { createAdminClient } from '@/lib/supabase-admin';
import { isMockAuthEnabled } from '@/lib/env';
import { enrichCashSessions } from '@/app/api/cash/_lib/session-summary';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const envMode = (request.headers.get('x-env-mode') || request.headers.get('X-Env-Mode') || '').toLowerCase();
    const mockEnabled = isMockAuthEnabled() || envMode === 'mock';

    if ((authError || !user) && !mockEnabled) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const headerOrgId = (request.headers.get('x-organization-id') || '').trim();
    let organizationId = headerOrgId;

    if (!organizationId && user?.id) {
      const resolvedOrgId = await getUserOrganizationId(user.id);
      if (resolvedOrgId) {
        organizationId = resolvedOrgId;
      }
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization header missing' }, { status: 400 });
    }

    let client: any = supabase;
    if (mockEnabled) {
      try {
        client = createAdminClient();
      } catch {
        client = supabase;
      }
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const status = searchParams.get('status') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const search = (searchParams.get('search') || '').trim();
    const orderBy = (searchParams.get('orderBy') || 'openedAt') as 'openedAt' | 'closedAt' | 'status';
    const orderDir = (searchParams.get('orderDir') || 'desc') as 'asc' | 'desc';

    const orderColumn =
      orderBy === 'closedAt' ? 'closed_at' : orderBy === 'status' ? 'status' : 'opened_at';
    const shouldFilterInMemory = Boolean(search);

    let query = client
      .from('cash_sessions')
      .select(
        `
          *,
          opened_by_user:opened_by(id, email, full_name),
          closed_by_user:closed_by(id, email, full_name)
        `,
        { count: 'exact' },
      )
      .eq('organization_id', organizationId)
      .order(orderColumn, { ascending: orderDir === 'asc' });

    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }

    if (from) {
      query = query.gte('opened_at', `${from}T00:00:00`);
    }

    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('opened_at', endOfDay.toISOString());
    }

    if (userId && userId !== 'all') {
      query = query.or(`opened_by.eq.${userId},closed_by.eq.${userId}`);
    }

    const start = (page - 1) * limit;
    const end = start + limit - 1;
    if (!shouldFilterInMemory) {
      query = query.range(start, end);
    }

    const { data: rows, error, count } = await query;
    if (error) {
      if (mockEnabled) {
        return NextResponse.json({
          sessions: [],
          pagination: { page, limit, total: 0, pages: 1 },
        });
      }

      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 },
      );
    }

    let sessionRows = (rows || []) as any[];
    if (shouldFilterInMemory) {
      const normalizedSearch = search.toLowerCase();
      sessionRows = sessionRows.filter((row) => {
        const searchable = [
          row.id,
          row.status,
          row.notes,
          row.opened_by_user?.full_name,
          row.opened_by_user?.email,
          row.closed_by_user?.full_name,
          row.closed_by_user?.email,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return searchable.some((value) => value.includes(normalizedSearch));
      });
    }

    const pagedRows = shouldFilterInMemory
      ? sessionRows.slice(start, end + 1)
      : sessionRows;

    const sessions = await enrichCashSessions(
      client,
      organizationId,
      pagedRows as any[],
      { recentMovementsLimit: 5 },
    );

    const total = shouldFilterInMemory
      ? sessionRows.length
      : typeof count === 'number'
        ? count
        : sessions.length;
    const pages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      sessions,
      pagination: { page, limit, total, pages },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error' },
      { status: 500 },
    );
  }
}
