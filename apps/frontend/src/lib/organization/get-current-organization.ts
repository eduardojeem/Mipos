import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Obtiene la organización actual desde las cookies
 * El middleware inyecta estas cookies después de detectar la organización por hostname o path
 */
export async function getCurrentOrganization() {
  const cookieStore = await cookies();
  
  const id = cookieStore.get('x-organization-id')?.value;
  const name = cookieStore.get('x-organization-name')?.value;
  const slug = cookieStore.get('x-organization-slug')?.value;
  
  if (!id) {
    // Fallback: resolver por slug si está disponible
    if (slug) {
      try {
        const supabase = await createClient();
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, slug, subdomain')
          .or(`slug.eq.${slug},subdomain.eq.${slug}`)
          .eq('is_active', true)
          .single();
        if (org?.id) {
          return { id: String(org.id), name: String(org.name || 'Unknown'), slug: String(org.slug || slug) };
        }
      } catch {}
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
    const cookieStore = await cookies();
    const id = cookieStore.get('x-organization-id')?.value;
    return !!id;
  } catch {
    return false;
  }
}
