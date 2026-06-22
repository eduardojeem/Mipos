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

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('branches')
    .select('id,name,slug,address,phone,is_active,created_at,updated_at')
    .eq('id', id)
    .eq('organization_id', access.context.companyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const body = (await request.json()) as Record<string, unknown>;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name.length < 2) return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    updates.name = name;
  }
  if (typeof body.address === 'string') updates.address = body.address.trim() || null;
  if (typeof body.phone === 'string') updates.phone = body.phone.trim() || null;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'Sin cambios para aplicar' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  const { data: existing } = await adminClient
    .from('branches')
    .select('id')
    .eq('id', id)
    .eq('organization_id', access.context.companyId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  const { data, error } = await adminClient
    .from('branches')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', access.context.companyId)
    .select('id,name,slug,address,phone,is_active,created_at,updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message || 'No se pudo actualizar la sucursal' }, { status: 500 });

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Only OWNER or SUPER_ADMIN can delete
  const access = await requireCompanyAccess(request, {
    companyId: getOrgId(request),
    allowedRoles: ['OWNER', 'SUPER_ADMIN'],
  });
  if (!access.ok) return NextResponse.json(access.body, { status: access.status });
  if (!access.context.companyId) return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });

  const adminClient = await createAdminClient();

  // Cannot delete the only branch
  const { count: totalCount } = await adminClient
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', access.context.companyId);

  if ((totalCount ?? 0) <= 1) {
    return NextResponse.json(
      { error: 'No puedes eliminar la única sucursal de la organización. Crea otra primero.' },
      { status: 400 }
    );
  }

  // Verify it belongs to this org
  const { data: existing } = await adminClient
    .from('branches')
    .select('id,name')
    .eq('id', id)
    .eq('organization_id', access.context.companyId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Sucursal no encontrada' }, { status: 404 });

  // Check for associated records — prefer soft delete if data exists
  const [{ count: salesCount }, { count: cashCount }, { count: movementsCount }] = await Promise.all([
    adminClient
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', access.context.companyId)
      .eq('branch_id', id),
    adminClient
      .from('cash_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', access.context.companyId)
      .eq('branch_id', id),
    adminClient
      .from('inventory_movements')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', access.context.companyId)
      .eq('branch_id', id),
  ]);

  const hasLinkedData = (salesCount ?? 0) > 0 || (cashCount ?? 0) > 0 || (movementsCount ?? 0) > 0;

  if (hasLinkedData) {
    const { data, error } = await adminClient
      .from('branches')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', access.context.companyId)
      .select('id,name,is_active')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      softDeleted: true,
      data,
      message: 'La sucursal fue desactivada. Tiene ventas, cajas o movimientos asociados y no puede eliminarse definitivamente.',
    });
  }

  const { error } = await adminClient
    .from('branches')
    .delete()
    .eq('id', id)
    .eq('organization_id', access.context.companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, softDeleted: false });
}
