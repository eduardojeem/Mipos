import { createClient } from '@/lib/supabase/server'

/**
 * Obtiene el organization_id del usuario autenticado
 * @param userId - ID del usuario
 * @returns organization_id o null si no pertenece a ninguna organización
 */
export async function getUserOrganizationId(
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single()
  
  if (error || !data) return null
  return data.organization_id
}

/**
 * Valida que el usuario tenga acceso a la organización especificada
 * @param userId - ID del usuario
 * @param organizationId - ID de la organización a validar
 * @returns true si el usuario pertenece a la organización
 */
export async function validateOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()
  
  return !error && !!data
}

/**
 * Obtiene información completa de la organización del usuario
 * @param userId - ID del usuario
 * @returns Información de la organización y membresía
 */
export async function getUserOrganization(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role_id,
      is_owner,
      organization:organizations(
        id,
        name,
        slug,
        subscription_plan,
        subscription_status,
        settings
      )
    `)
    .eq('user_id', userId)
    .single()
  
  if (error || !data) return null
  return data
}

/**
 * Obtiene todos los IDs de organizaciones a las que pertenece el usuario
 * Útil para usuarios que pueden pertenecer a múltiples organizaciones
 * @param userId - ID del usuario
 * @returns Array de organization_ids
 */
export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
  
  if (error || !data) return []
  return data.map((m: { organization_id: string }) => m.organization_id)
}
