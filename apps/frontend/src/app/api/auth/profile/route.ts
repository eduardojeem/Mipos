import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

interface UserProfileData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const ROLE_PRIORITY = ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'EMPLOYEE', 'USER'] as const;

function normalizeRoleName(role?: string | null): string {
  const normalized = String(role || '').toUpperCase().trim();
  if (!normalized) return 'USER';
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (normalized === 'OWNER') return 'OWNER';
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'MANAGER') return 'MANAGER';
  if (normalized === 'CASHIER') return 'CASHIER';
  if (normalized === 'EMPLOYEE') return 'EMPLOYEE';
  return 'USER';
}

function pickHighestRole(...roles: Array<string | null | undefined>): string {
  const normalizedRoles = roles.map(normalizeRoleName);
  return ROLE_PRIORITY.find((role) => normalizedRoles.includes(role)) || 'USER';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const orgHeader = request.headers.get('x-organization-id')?.trim() || null;
    const orgCookie = request.cookies.get('x-organization-id')?.value || null;
    const preferredOrgId = orgHeader || orgCookie;

    // Run ALL role-related queries in parallel instead of sequentially
    const [userResult, rolesResult, memberResult] = await Promise.allSettled([
      // 1. Users table profile
      admin.from('users').select('id, email, full_name, role, created_at, updated_at').eq('id', user.id).single(),
      // 2. RBAC roles
      admin.from('user_roles').select('role:roles(name)').eq('user_id', user.id).eq('is_active', true),
      // 3. Organization membership + role
      preferredOrgId
        ? admin.from('organization_members').select('role_id, is_owner').eq('organization_id', preferredOrgId).eq('user_id', user.id).maybeSingle()
        : admin.from('organization_members').select('organization_id, role_id, is_owner').eq('user_id', user.id).order('is_owner', { ascending: false }).order('created_at', { ascending: true }).limit(1).maybeSingle(),
    ]);

    // Extract profile data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRecord = userResult.status === 'fulfilled' ? (userResult.value as any)?.data : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRoles = rolesResult.status === 'fulfilled' ? (rolesResult.value as any)?.data : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membership = memberResult.status === 'fulfilled' ? (memberResult.value as any)?.data : null;

    // Collect all role candidates
    const roleCandidates: Array<string | null | undefined> = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user.user_metadata as any)?.role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user.app_metadata as any)?.role,
      userRecord?.role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(userRoles || []).map((row: any) => row?.role?.name).filter(Boolean),
    ];

    // If membership has a role_id, resolve it (single extra query only if needed)
    if (membership?.role_id) {
      const { data: roleRow } = await admin.from('roles').select('name').eq('id', membership.role_id).maybeSingle();
      if (roleRow?.name) {
        roleCandidates.push(roleRow.name as string);
      }
    }
    if (membership?.is_owner) {
      roleCandidates.push('OWNER');
    }

    const resolvedRole = pickHighestRole(...roleCandidates);

    // Build profile response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (user.user_metadata || {}) as any;
    const userData: UserProfileData = {
      id: userRecord?.id || user.id,
      email: userRecord?.email || user.email || '',
      name: userRecord?.full_name || meta?.name || meta?.full_name || user.email?.split('@')[0] || 'Usuario',
      phone: meta?.phone || '',
      bio: meta?.bio || '',
      location: meta?.location || '',
      avatar_url: meta?.avatar_url || '',
      role: resolvedRole,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      created_at: userRecord?.created_at || (user as any).created_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updated_at: userRecord?.updated_at || (user as any).updated_at || (user as any).created_at,
    };

    return NextResponse.json({ success: true, data: userData });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, avatar_url, bio, location } = body;

    // Validaciones básicas
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ 
        error: 'El nombre debe tener al menos 2 caracteres' 
      }, { status: 400 });
    }

    if (phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(phone)) {
      return NextResponse.json({ 
        error: 'Formato de teléfono inválido' 
      }, { status: 400 });
    }

    if (typeof bio === 'string' && bio.length > 500) {
      return NextResponse.json({ 
        error: 'La biografía no puede exceder 500 caracteres' 
      }, { status: 400 });
    }

    if (typeof location === 'string' && location.length > 100) {
      return NextResponse.json({ 
        error: 'La ubicación no puede exceder 100 caracteres' 
      }, { status: 400 });
    }

    // avatar_url opcional: si se envía, aceptar string (URL/http o data URI)
    const trimmedAvatarUrl = typeof avatar_url === 'string' ? avatar_url.trim() : undefined;

    const updateData = {
      name: name.trim(),
      phone: phone?.trim() || null,
      bio: typeof bio === 'string' ? bio : undefined,
      location: typeof location === 'string' ? location : undefined,
      avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || null) : undefined,
      updated_at: new Date().toISOString()
    };

    // Intentar actualizar directamente en la tabla users (upsert por id)
    let updatedUser = null;
    try {
      const upsertPayload: any = {
        id: user.id,
        email: user.email || '',
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? null,
        location: updateData.location ?? null,
        avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || null) : null,
        role: (user.user_metadata as any)?.role || 'user',
        updated_at: updateData.updated_at,
      };

      const { data: userRecord, error: upsertError } = await supabase
        .from('users')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select('*')
        .single();

      if (!upsertError && userRecord) {
        updatedUser = userRecord as any;
      }
    } catch (error) {
      console.warn('No se pudo upsert en users, usar fallback a user_metadata');
    }

    // Fallback: actualizar user_metadata
    if (!updatedUser) {
      const metadataUpdates: any = {
        ...(user.user_metadata as any),
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? (user.user_metadata as any)?.bio,
        location: updateData.location ?? (user.user_metadata as any)?.location,
        updated_at: updateData.updated_at,
      };
      if (typeof trimmedAvatarUrl === 'string') {
        metadataUpdates.avatar_url = trimmedAvatarUrl || '';
      }

      const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
        data: metadataUpdates
      });

      if (authUpdateError) {
        console.error('Error updating user metadata:', authUpdateError);
        return NextResponse.json({
          success: false,
          error: 'Error al actualizar el perfil'
        }, { status: 500 });
      }

      updatedUser = {
        id: user.id,
        email: user.email,
        name: updateData.name,
        phone: updateData.phone,
        bio: updateData.bio ?? (user.user_metadata as any)?.bio ?? '',
        location: updateData.location ?? (user.user_metadata as any)?.location ?? '',
        avatar_url: typeof trimmedAvatarUrl === 'string' ? (trimmedAvatarUrl || '') : ((user.user_metadata as any)?.avatar_url || ''),
        role: (user.user_metadata as any)?.role || 'user',
        created_at: (user as any).created_at,
        updated_at: updateData.updated_at
      };
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
