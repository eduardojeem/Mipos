import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { resolveOrganizationId } from '@/lib/organization';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: 'Propietario de la organizacion',
  SUPER_ADMIN: 'Administrador global del sistema',
  ADMIN: 'Administrador con acceso completo',
  MANAGER: 'Gerente con permisos de gestion',
  SELLER: 'Vendedor con acceso comercial',
  CASHIER: 'Cajero con acceso operativo',
  VIEWER: 'Visualizador con acceso de solo lectura',
  INVENTORY_MANAGER: 'Gestor de inventario',
  ACCOUNTANT: 'Contador con acceso financiero',
  MEMBER: 'Miembro de la organizacion',
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    'Gestion completa',
    'Usuarios',
    'Configuracion',
    'Reportes',
    'Ventas',
    'Inventario',
    'Finanzas',
    'Suscripcion',
  ],
  SUPER_ADMIN: [
    'Gestion completa',
    'Usuarios',
    'Configuracion',
    'Reportes',
    'Ventas',
    'Inventario',
    'Finanzas',
    'Suscripcion',
  ],
  ADMIN: [
    'Gestion completa',
    'Usuarios',
    'Configuracion',
    'Reportes',
    'Ventas',
    'Inventario',
    'Finanzas',
  ],
  MANAGER: ['Gestion de ventas', 'Reportes', 'Inventario', 'Clientes', 'Empleados'],
  SELLER: ['Punto de venta', 'Ventas', 'Clientes', 'Productos'],
  CASHIER: ['Punto de venta', 'Caja', 'Ventas basicas'],
  VIEWER: ['Ver reportes', 'Ver productos', 'Ver ventas'],
  INVENTORY_MANAGER: ['Gestion de inventario', 'Productos', 'Proveedores', 'Movimientos'],
  ACCOUNTANT: ['Reportes financieros', 'Caja', 'Ventas', 'Gastos'],
  MEMBER: ['Acceso basico'],
};

type RoleRelation = { name?: string | null; display_name?: string | null } | Array<{ name?: string | null; display_name?: string | null }> | null;
type MembershipRow = { organization_id?: string | null; role_id?: string | null; is_owner?: boolean | null; role?: RoleRelation };
type UserRow = { organization_id?: string | null; role?: string | null };
type OrganizationRow = { id: string; name: string; slug: string | null };

function firstRelation<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function normalizeRoleName(role?: string | null, isOwner = false): string {
  if (isOwner) return 'OWNER';

  const normalized = String(role || '').toUpperCase().trim();
  if (!normalized) return 'MEMBER';
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (normalized === 'OWNER') return 'OWNER';
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'MANAGER') return 'MANAGER';
  if (normalized === 'SELLER' || normalized === 'VENDEDOR') return 'SELLER';
  if (normalized === 'CASHIER' || normalized === 'CAJERO') return 'CASHIER';
  if (normalized === 'VIEWER') return 'VIEWER';
  if (normalized === 'INVENTORY_MANAGER') return 'INVENTORY_MANAGER';
  if (normalized === 'ACCOUNTANT') return 'ACCOUNTANT';
  return 'MEMBER';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const requestedOrganizationId = await resolveOrganizationId(request);

    let membershipQuery = admin
      .from('organization_members')
      .select('organization_id, role_id, is_owner, role:roles(name,display_name)')
      .eq('user_id', user.id)
      .order('is_owner', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (requestedOrganizationId) {
      membershipQuery = membershipQuery.eq('organization_id', requestedOrganizationId);
    }

    const { data: membershipData, error: membershipError } = await membershipQuery.maybeSingle();
    const membership = (membershipData || null) as MembershipRow | null;

    const { data: userRowData } = await admin
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle();
    const userRow = (userRowData || null) as UserRow | null;

    const targetOrgId = requestedOrganizationId || membership?.organization_id || userRow?.organization_id || null;

    if (membershipError && !targetOrgId) {
      console.warn('Organization membership lookup failed:', membershipError.message);
    }

    if (!targetOrgId) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Usuario sin organizacion asignada',
      });
    }

    const { data: organizationData, error: organizationError } = await admin
      .from('organizations')
      .select('id, name, slug')
      .eq('id', targetOrgId)
      .maybeSingle();
    const organization = (organizationData || null) as OrganizationRow | null;

    if (organizationError || !organization) {
      return NextResponse.json({ error: 'No se pudo cargar la organizacion' }, { status: 500 });
    }

    const roleRelation = firstRelation(membership?.role as RoleRelation);
    const resolvedRole = normalizeRoleName(
      roleRelation?.name || userRow?.role || (user.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined,
      Boolean(membership?.is_owner)
    );

    let permissions = ROLE_PERMISSIONS[resolvedRole] || ROLE_PERMISSIONS.MEMBER;

    if (membership?.role_id && resolvedRole !== 'OWNER' && resolvedRole !== 'SUPER_ADMIN') {
      const { data: permissionRows } = await admin
        .from('role_permissions')
        .select('permission:permissions(name,is_active)')
        .eq('role_id', membership.role_id);

      const resolvedPermissions = Array.from(
        new Set(
          (permissionRows || [])
            .map((row: any) => (row?.permission?.is_active === false ? null : row?.permission?.name))
            .filter(Boolean)
            .map(String)
        )
      );

      if (resolvedPermissions.length > 0) {
        permissions = resolvedPermissions;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: resolvedRole,
        roleDescription: ROLE_DESCRIPTIONS[resolvedRole] || ROLE_DESCRIPTIONS.MEMBER,
        permissions,
        isOwner: Boolean(membership?.is_owner),
      },
    });
  } catch (error) {
    console.error('Error in organization info API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
