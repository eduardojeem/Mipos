import { cookies } from 'next/headers';

/**
 * Obtiene la organización actual desde las cookies
 * El middleware inyecta estas cookies después de detectar la organización por hostname o path
 */
export async function getCurrentOrganization() {
  const cookieStore = cookies();
  
  const id = cookieStore.get('x-organization-id')?.value;
  const name = cookieStore.get('x-organization-name')?.value;
  const slug = cookieStore.get('x-organization-slug')?.value;
  
  if (!id) {
    // En desarrollo, intentar obtener la primera organización activa
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  No organization context found in cookies. Using fallback in development.');
      
      // Retornar una organización por defecto para desarrollo
      // En producción, esto debería fallar
      return {
        id: 'development-fallback',
        name: 'Development Organization',
        slug: 'development',
      };
    }
    
    throw new Error('No organization context found. Make sure middleware is configured correctly and you are accessing via /{slug}/page format.');
  }
  
  return {
    id,
    name: name || 'Unknown',
    slug: slug || 'unknown',
  };
}

/**
 * Obtiene solo el ID de la organización actual
 * Útil para queries rápidas
 */
export async function getCurrentOrganizationId(): Promise<string> {
  const org = await getCurrentOrganization();
  return org.id;
}

/**
 * Verifica si hay contexto de organización disponible
 * Útil para páginas que pueden funcionar con o sin organización
 */
export async function hasOrganizationContext(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const id = cookieStore.get('x-organization-id')?.value;
    return !!id;
  } catch {
    return false;
  }
}
