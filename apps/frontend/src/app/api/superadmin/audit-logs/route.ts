import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const admin = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');

    const { data, error } = await admin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Audit Logs API] Error fetching logs:', error);
      
      // Si la tabla no existe, devolver array vacío en lugar de error
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('[Audit Logs API] Table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[Audit Logs API] Internal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
