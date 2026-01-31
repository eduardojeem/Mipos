import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Organization utilities for multitenancy support
 * Provides server-side validation and extraction of organization context
 */

export interface OrganizationContext {
  organizationId: string;
  userId: string;
}

/**
 * Extrae y valida la organización del usuario desde el request
 * @param request - Next.js request object
 * @returns organization_id validado o null si no es válido
 */
export async function getValidatedOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const supabase = await createClient();
  
  // 1. Obtener usuario actual autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.warn('Organization validation: No authenticated user found');
    return null;
  }

  // 2. Intentar obtener organización del header
  const requestedOrgId = request.headers.get('x-organization-id')?.trim();
  
  // 3. Si se especificó una organización, validar que el usuario pertenece a ella
  if (requestedOrgId) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', requestedOrgId)
      .single();
    
    if (error || !data) {
      console.warn(
        `Organization validation: User ${user.id} attempted to access org ${requestedOrgId} without permission`
      );
      return null;
    }
    
    return requestedOrgId;
  }

  // 4. Fallback: obtener la primera organización del usuario
  const { data: memberData, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (memberError || !memberData) {
    console.warn(
      `Organization validation: User ${user.id} has no organization memberships`
    );
    return null;
  }

  return memberData.organization_id;
}

/**
 * Middleware helper para requerir organización válida
 * Lanza un error si no se encuentra una organización válida
 * @param request - Next.js request object
 * @returns organization_id validado
 * @throws Error si no hay organización válida
 */
export async function requireOrganization(request: NextRequest): Promise<string> {
  const orgId = await getValidatedOrganizationId(request);
  
  if (!orgId) {
    throw new Error('No valid organization found for user');
  }
  
  return orgId;
}

/**
 * Obtiene el contexto completo de organización y usuario
 * @param request - Next.js request object
 * @returns Objeto con organizationId y userId
 * @throws Error si no hay organización válida
 */
export async function getOrganizationContext(
  request: NextRequest
): Promise<OrganizationContext> {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }

  const organizationId = await requireOrganization(request);
  
  return {
    organizationId,
    userId: user.id,
  };
}

/**
 * Verifica si un usuario pertenece a una organización específica
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización
 * @returns true si el usuario pertenece a la organización
 */
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

/**
 * Obtiene todas las organizaciones de un usuario
 * @param userId - ID del usuario
 * @returns Lista de IDs de organizaciones
 */
export async function getUserOrganizations(userId: string): Promise<string[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);
  
  if (error || !data) {
    return [];
  }
  
  return data.map((m: { organization_id: string }) => m.organization_id);
}
