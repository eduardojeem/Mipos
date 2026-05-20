import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { normalizeRole } from '@/lib/roles';

export interface OrganizationContext {
  organizationId: string;
  userId: string;
}

async function getDbClient() {
  try {
    return createAdminClient();
  } catch {
    return await createClient();
  }
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user.id;
}

async function getAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

function extractRoleName(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const record = value as { name?: unknown };
  return typeof record.name === 'string' ? record.name : '';
}

async function isSuperAdminUser(
  client: Awaited<ReturnType<typeof getDbClient>>,
  user: User
): Promise<boolean> {
  const appRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role : '';
  if (normalizeRole(appRole) === 'SUPER_ADMIN') {
    return true;
  }

  const [profileResult, rolesResult] = await Promise.allSettled([
    client.from('users').select('role').eq('id', user.id).maybeSingle(),
    client
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  const profileRole =
    profileResult.status === 'fulfilled'
      ? ((profileResult.value as { data?: { role?: string | null } | null }).data?.role || '')
      : '';

  if (normalizeRole(profileRole) === 'SUPER_ADMIN') {
    return true;
  }

  const roles =
    rolesResult.status === 'fulfilled'
      ? (((rolesResult.value as { data?: Array<{ role?: unknown }> | null }).data || []) as Array<{ role?: unknown }>)
      : [];

  return roles.some((row) => {
    const roleValue = Array.isArray(row.role) ? row.role[0] : row.role;
    return normalizeRole(extractRoleName(roleValue)) === 'SUPER_ADMIN';
  });
}

async function validateRequestedOrganizationId(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  user: User,
  requestedOrgId: string
): Promise<string | null> {
  const normalizedOrgId = requestedOrgId.trim();
  if (!normalizedOrgId) return null;

  const client = await getDbClient();

  if (await isSuperAdminUser(client, user)) {
    const { data: organization } = await client
      .from('organizations')
      .select('id')
      .eq('id', normalizedOrgId)
      .maybeSingle();

    return organization?.id || null;
  }

  const { data, error } = await client
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', normalizedOrgId)
    .maybeSingle();

  if (error || !data) {
    // Fallback: check users table
    const { data: userRow } = await client
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userRow?.organization_id === normalizedOrgId) {
      return normalizedOrgId;
    }
    return null;
  }

  return normalizedOrgId;
}

async function getFallbackOrganizationId(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  user: User
): Promise<string | null> {
  const client = await getDbClient();
  const { data: memberData } = await client
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (memberData?.organization_id) {
    return memberData.organization_id;
  }

  // Fallback to users table
  const { data: userRow } = await client
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (userRow?.organization_id) {
    return userRow.organization_id;
  }

  if (await isSuperAdminUser(client, user)) {
    const { data: organization } = await client
      .from('organizations')
      .select('id')
      .neq('subscription_status', 'SUSPENDED')
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle();

    return organization?.id || null;
  }

  return null;
}

export async function getValidatedOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return null;
  }

  const requestedOrgId = request.headers.get('x-organization-id')?.trim();
  if (requestedOrgId) {
    const validatedOrgId = await validateRequestedOrganizationId(supabase, user, requestedOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }
  }

  const cookieOrgId = request.cookies.get('x-organization-id')?.value?.trim();
  if (cookieOrgId) {
    const validatedOrgId = await validateRequestedOrganizationId(supabase, user, cookieOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }
  }

  return getFallbackOrganizationId(supabase, user);
}

export async function resolveOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  const headerOrgId = request.headers.get('x-organization-id')?.trim();
  if (headerOrgId) {
    if (!user) {
      return null;
    }

    const validatedOrgId = await validateRequestedOrganizationId(supabase, user, headerOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }

    return getFallbackOrganizationId(supabase, user);
  }

  const cookieOrgId = request.cookies.get('x-organization-id')?.value?.trim();
  if (cookieOrgId) {
    if (!user) {
      return null;
    }

    const validatedOrgId = await validateRequestedOrganizationId(supabase, user, cookieOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }

    return getFallbackOrganizationId(supabase, user);
  }

  if (!user) {
    return null;
  }

  return getFallbackOrganizationId(supabase, user);
}

export async function getValidatedOrganizationIdFromCookies(): Promise<string | null> {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get('x-organization-id')?.value?.trim();

  if (cookieOrgId) {
    const validatedOrgId = await validateRequestedOrganizationId(supabase, user, cookieOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }
  }

  return getFallbackOrganizationId(supabase, user);
}

export async function requireOrganization(request: NextRequest): Promise<string> {
  const orgId = await getValidatedOrganizationId(request);

  if (!orgId) {
    throw new Error('No valid organization found for user');
  }

  return orgId;
}

export async function getOrganizationContext(
  request: NextRequest
): Promise<OrganizationContext> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const organizationId = await requireOrganization(request);

  return {
    organizationId,
    userId,
  };
}

export async function userBelongsToOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  return !error && !!data;
}

export async function getUserOrganizations(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);

  if (error || !data) {
    return [];
  }

  return data.map((member: { organization_id: string }) => member.organization_id);
}
