import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';

type AcceptanceRow = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  terms_version: string | null;
  source: string | null;
  ip: string | null;
  accepted_at: string | null;
};

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '25', 10) || 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createAdminClient();

  const { data, count, error } = await admin
    .from('terms_acceptances')
    .select('id, user_id, organization_id, terms_version, source, ip, accepted_at', { count: 'exact' })
    .order('accepted_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[terms-acceptances GET]', error.message);
    return NextResponse.json({ error: 'Error al obtener aceptaciones' }, { status: 500 });
  }

  const rows = (data || []) as AcceptanceRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const orgIds = [...new Set(rows.map((r) => r.organization_id).filter(Boolean))] as string[];

  // Enriquecer con nombre/email del usuario y nombre de la organización.
  // Si alguna query falla (columna distinta), degradamos a null sin romper.
  const [usersRes, orgsRes] = await Promise.all([
    userIds.length
      ? admin.from('users').select('id, full_name, email').in('id', userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    orgIds.length
      ? admin.from('organizations').select('id, name').in('id', orgIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const userMap = new Map(
    ((usersRes.data as Array<Record<string, unknown>>) || []).map((u) => [String(u.id), u]),
  );
  const orgMap = new Map(
    ((orgsRes.data as Array<Record<string, unknown>>) || []).map((o) => [String(o.id), o]),
  );

  const items = rows.map((r) => {
    const u = r.user_id ? userMap.get(r.user_id) : undefined;
    const o = r.organization_id ? orgMap.get(r.organization_id) : undefined;
    return {
      id: r.id,
      userId: r.user_id,
      userName: (u?.full_name as string) ?? null,
      userEmail: (u?.email as string) ?? null,
      organizationId: r.organization_id,
      organizationName: (o?.name as string) ?? null,
      termsVersion: r.terms_version,
      source: r.source,
      ip: r.ip,
      acceptedAt: r.accepted_at,
    };
  });

  const total = count ?? items.length;
  return NextResponse.json({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
