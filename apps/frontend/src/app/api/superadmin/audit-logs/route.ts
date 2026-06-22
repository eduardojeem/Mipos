import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { sanitizeSearch } from '@/app/api/_utils/search';

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const action = (searchParams.get('action') || '').trim();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = admin
      .from('audit_logs')
      .select('id, action, entity_type, user_email, user_role, ip_address, details, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }
    if (search) {
      { const s = sanitizeSearch(search); query = query.or(`user_email.ilike.%${s}%,action.ilike.%${s}%`); }
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('[Audit Logs API] Error fetching logs:', error);
      
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return NextResponse.json({ data: [], total: 0, page, limit });
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], total: count || 0, page, limit });
  } catch (error: any) {
    console.error('[Audit Logs API] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
