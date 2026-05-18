import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization';
import { createAdminClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

function getOrgId(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-organization-id')?.trim() ||
    request.nextUrl.searchParams.get('organizationId')?.trim() ||
    undefined
  );
}

/** GET /api/branches/[id]/users — list users assigned to a branch */
export async function GET(request: NextRequest, { params }: Params) {
  const { id: branchId } = await params;

  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const adminClient = await createAdminClient();

  // Verify branch belongs to org
  const { data: branch } = await adminClient
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('organization_id', access.context.companyId)
    .maybeSingle();
  if (!branch) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  // Get assigned users
  const { data: assignments, error } = await adminClient
    .from('user_branches')
    .select('user_id, assigned_at')
    .eq('branch_id', branchId)
    .eq('organization_id', access.context.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!assignments?.length) return NextResponse.json({ success: true, data: [] });

  // Get user details
  const userIds = assignments.map((a: { user_id: string }) => a.user_id);
  const { data: users } = await adminClient
    .from('users')
    .select('id, email, full_name, role')
    .in('id', userIds);

  const userMap = new Map((users ?? []).map((u: { id: string; email: string; full_name: string | null; role: string | null }) => [u.id, u]));

  const data = assignments.map((a: { user_id: string; assigned_at: string }) => ({
    user_id: a.user_id,
    assigned_at: a.assigned_at,
    ...(userMap.get(a.user_id) ?? {}),
  }));

  return NextResponse.json({ success: true, data });
}

/** POST /api/branches/[id]/users — assign a user to a branch */
export async function POST(request: NextRequest, { params }: Params) {
  const { id: branchId } = await params;

  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const body = (await request.json()) as { user_id?: unknown };
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  if (!userId) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });

  const adminClient = await createAdminClient();

  // Verify branch belongs to org
  const { data: branch } = await adminClient
    .from('branches')
    .select('id')
    .eq('id', branchId)
    .eq('organization_id', access.context.companyId)
    .maybeSingle();
  if (!branch) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  // Verify user belongs to org
  const { data: member } = await adminClient
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', access.context.companyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: 'Usuario no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await adminClient
    .from('user_branches')
    .upsert(
      {
        user_id: userId,
        branch_id: branchId,
        organization_id: access.context.companyId,
        assigned_by: access.context.userId,
      },
      { onConflict: 'user_id,branch_id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

/** DELETE /api/branches/[id]/users?user_id=xxx — remove user from branch */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id: branchId } = await params;

  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const userId = request.nextUrl.searchParams.get('user_id')?.trim();
  if (!userId) return NextResponse.json({ error: 'user_id requerido como query param' }, { status: 400 });

  const adminClient = await createAdminClient();

  const { error } = await adminClient
    .from('user_branches')
    .delete()
    .eq('branch_id', branchId)
    .eq('user_id', userId)
    .eq('organization_id', access.context.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
