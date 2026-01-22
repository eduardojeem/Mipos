import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Tipos explícitos para la respuesta REST de Supabase
type PermissionRecord = {
  name: string | null;
  resource: string | null;
  action: string | null;
};

type RolePermission = {
  permission_id: string;
  permissions?: PermissionRecord | null;
};

type Role = {
  name: string;
  role_permissions?: RolePermission[] | null;
};

type UserRoleItem = {
  role_id: string;
  roles?: Role | null;
};

type FlattenedPermission = {
  id: string;
  name: string | null;
  resource: string | null;
  action: string | null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Use server Supabase client only to validate auth and obtain token
    const supabase = await createClient();
    const { id: userId } = await context.params;

    // Primero validar usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Usar RPC segura con SECURITY DEFINER para evitar joins REST ambiguos
    // Preferimos get_user_permissions(UUID) si está disponible
    let rpcData: any = null;
    let rpcErr: any = null;
    const candidates = [
      { args: { user_uuid: userId } },
      { args: { user_id: userId } },
      { args: { uid: userId } },
    ];
    for (const c of candidates) {
      const r = await (supabase as any).rpc('get_user_permissions', c.args);
      if (!r.error) { rpcData = r.data; rpcErr = null; break; }
      rpcErr = r.error;
    }
    if (rpcErr) {
      return NextResponse.json({ success: true, permissions: [] });
    }

    // Mapear respuesta de RPC a formato plano
    const permissions: FlattenedPermission[] = (rpcData || []).map((p: any, idx: number) => ({
      id: String(p.permission_name || `${p.resource}:${p.action}:${idx}`),
      name: p.permission_name || (p.resource && p.action ? `${p.resource}:${p.action}` : null),
      resource: p.resource ?? null,
      action: p.action ?? null,
    }));

    // Remove duplicates
    const uniquePermissions: FlattenedPermission[] = permissions.filter((permission: FlattenedPermission, index: number, self: FlattenedPermission[]) =>
      index === self.findIndex((p: FlattenedPermission) => p.id === permission.id)
    );

    return NextResponse.json({ success: true, permissions: uniquePermissions });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}