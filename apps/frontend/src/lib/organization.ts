import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface OrganizationContext {
  organizationId: string;
  userId: string;
}

async function getAuthenticatedUserId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.warn('Organization validation: No authenticated user found');
    return null;
  }

  return user.id;
}

async function validateRequestedOrganizationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedOrgId: string
): Promise<string | null> {
  const normalizedOrgId = requestedOrgId.trim();
  if (!normalizedOrgId) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', normalizedOrgId)
    .single();

  if (error || !data) {
    console.warn(
      `Organization validation: User ${userId} attempted to access org ${normalizedOrgId} without permission`
    );
    return null;
  }

  return normalizedOrgId;
}

async function getFallbackOrganizationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: memberData, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (memberError || !memberData) {
    console.warn(
      `Organization validation: User ${userId} has no organization memberships`
    );
    return null;
  }

  return memberData.organization_id;
}

export async function getValidatedOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return null;
  }

  const requestedOrgId = request.headers.get('x-organization-id')?.trim();
  if (requestedOrgId) {
    const validatedOrgId = await validateRequestedOrganizationId(supabase, userId, requestedOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }
  }

  return getFallbackOrganizationId(supabase, userId);
}

export async function resolveOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const headerOrgId = request.headers.get('x-organization-id')?.trim();
  if (headerOrgId) {
    return headerOrgId;
  }

  const cookieOrgId = request.cookies.get('x-organization-id')?.value?.trim();
  if (cookieOrgId) {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);

    if (!userId) {
      return cookieOrgId;
    }

    const validatedOrgId = await validateRequestedOrganizationId(supabase, userId, cookieOrgId);
    if (validatedOrgId) {
      return validatedOrgId;
    }

    return getFallbackOrganizationId(supabase, userId);
  }

  return getValidatedOrganizationId(request);
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
