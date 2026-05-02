import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminClient, createClient } from '@/lib/supabase/server';

interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  phone: string;
  bio: string;
  location: string;
  avatar_url: string;
  role: string;
  created_at: string;
  updated_at: string;
  lastLogin?: string;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function buildProfileResponse(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  user: User,
  preferredOrgId?: string | null
): Promise<UserProfileResponse> {
  const metadata = asRecord(user.user_metadata);
  const appMetadata = asRecord(user.app_metadata);

  const [userResult, rolesResult, memberResult] = await Promise.allSettled([
    admin
      .from('users')
      .select('id, email, full_name, phone, role, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true),
    preferredOrgId
      ? admin
          .from('organization_members')
          .select('organization_id, role_id, is_owner, role:roles(name)')
          .eq('organization_id', preferredOrgId)
          .eq('user_id', user.id)
          .maybeSingle()
      : admin
          .from('organization_members')
          .select('organization_id, role_id, is_owner, role:roles(name)')
          .eq('user_id', user.id)
          .order('is_owner', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
  ]);

  const userRecord =
    userResult.status === 'fulfilled' ? ((userResult.value as { data?: Record<string, unknown> | null }).data || null) : null;
  const userRoles =
    rolesResult.status === 'fulfilled' ? ((rolesResult.value as { data?: Array<Record<string, unknown>> | null }).data || []) : [];
  const membership =
    memberResult.status === 'fulfilled' ? ((memberResult.value as { data?: Record<string, unknown> | null }).data || null) : null;

  const membershipRole =
    Array.isArray(membership?.role) ? membership?.role[0] : membership?.role;

  const roleCandidates: Array<string | null | undefined> = [
    toStringValue(metadata.role),
    toStringValue(appMetadata.role),
    userRecord ? toStringValue(userRecord.role) : '',
    ...(userRoles || []).map((row) => {
      const roleValue = Array.isArray(row.role) ? row.role[0] : row.role;
      return toStringValue((roleValue as Record<string, unknown> | undefined)?.name);
    }),
    toStringValue((membershipRole as Record<string, unknown> | undefined)?.name),
  ];

  if (membership && membership.is_owner === true) {
    roleCandidates.push('OWNER');
  }

  const createdAt = toStringValue(userRecord?.created_at) || toStringValue(user.created_at) || new Date().toISOString();
  const updatedAt =
    toStringValue(userRecord?.updated_at) ||
    toStringValue(metadata.updated_at) ||
    toStringValue(user.updated_at) ||
    createdAt;

  return {
    id: toStringValue(userRecord?.id) || user.id,
    email: toStringValue(userRecord?.email) || user.email || '',
    name:
      toStringValue(userRecord?.full_name) ||
      toStringValue(metadata.full_name) ||
      toStringValue(metadata.name) ||
      user.email?.split('@')[0] ||
      'Usuario',
    phone: toStringValue(userRecord?.phone) || toStringValue(metadata.phone),
    bio: toStringValue(metadata.bio),
    location: toStringValue(metadata.location),
    avatar_url: toStringValue(metadata.avatar_url),
    role: pickHighestRole(...roleCandidates),
    created_at: createdAt,
    updated_at: updatedAt,
    lastLogin: toStringValue(user.last_sign_in_at),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const preferredOrgId =
      request.headers.get('x-organization-id')?.trim() ||
      request.cookies.get('x-organization-id')?.value?.trim() ||
      null;

    const profile = await buildProfileResponse(admin, user, preferredOrgId);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = await createAdminClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, avatar_url, bio, location } = body as {
      name?: string;
      phone?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    };

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 });
    }

    if (phone && !/^\+?[\d\s\-\(\)]{8,}$/.test(phone)) {
      return NextResponse.json({ error: 'Formato de telefono invalido' }, { status: 400 });
    }

    if (typeof bio === 'string' && bio.length > 500) {
      return NextResponse.json({ error: 'La biografia no puede exceder 500 caracteres' }, { status: 400 });
    }

    if (typeof location === 'string' && location.length > 100) {
      return NextResponse.json({ error: 'La ubicacion no puede exceder 100 caracteres' }, { status: 400 });
    }

    const fullName = name.trim();
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    const normalizedBio = typeof bio === 'string' ? bio : '';
    const normalizedLocation = typeof location === 'string' ? location : '';
    const normalizedAvatarUrl = typeof avatar_url === 'string' ? avatar_url.trim() : '';
    const now = new Date().toISOString();

    const currentMetadata = asRecord(user.user_metadata);
    const { data: currentUserRowData } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const currentUserRow = (currentUserRowData || null) as { role?: string | null } | null;

    const metadataUpdates: Record<string, unknown> = {
      ...currentMetadata,
      full_name: fullName,
      name: fullName,
      phone: normalizedPhone,
      bio: normalizedBio,
      location: normalizedLocation,
      updated_at: now,
      avatar_url: normalizedAvatarUrl,
    };

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: metadataUpdates,
    });

    if (authUpdateError) {
      console.error('Error updating user metadata:', authUpdateError);
      return NextResponse.json({ success: false, error: 'Error al actualizar el perfil' }, { status: 500 });
    }

    const userUpsertPayload = {
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      phone: normalizedPhone || null,
      role: toStringValue(currentUserRow?.role) || toStringValue(currentMetadata.role) || 'CASHIER',
      updated_at: now,
    };

    const { error: userUpsertError } = await (admin.from('users') as any)
      .upsert(userUpsertPayload, { onConflict: 'id' });

    if (userUpsertError) {
      console.warn('Could not sync public.users profile row:', userUpsertError.message);
    }

    const preferredOrgId =
      request.headers.get('x-organization-id')?.trim() ||
      request.cookies.get('x-organization-id')?.value?.trim() ||
      null;

    const profile = await buildProfileResponse(admin, {
      ...user,
      user_metadata: metadataUpdates,
    }, preferredOrgId);

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Perfil actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
    }, { status: 500 });
  }
}
