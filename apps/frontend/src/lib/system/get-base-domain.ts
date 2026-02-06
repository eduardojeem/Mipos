import { createClient } from '@/lib/supabase/server';

/**
 * Obtiene el dominio base configurado en el sistema
 * Prioridad:
 * 1. Base de datos (system_settings)
 * 2. Variable de entorno NEXT_PUBLIC_BASE_DOMAIN
 * 3. Valor por defecto: miposparaguay.vercel.app
 */
export async function getBaseDomain(): Promise<string> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'base_domain')
      .single();

    if (!error && data?.value?.domain) {
      return data.value.domain;
    }
  } catch (error) {
    console.warn('Could not fetch base domain from database:', error);
  }

  // Fallback a variable de entorno o valor por defecto
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app';
}

/**
 * Versión síncrona que solo usa variables de entorno
 * Útil para middleware y contextos donde no se puede hacer async
 */
export function getBaseDomainSync(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || 'miposparaguay.vercel.app';
}

/**
 * Construye la URL completa de un subdominio
 */
export function buildSubdomainUrl(subdomain: string, baseDomain?: string): string {
  const domain = baseDomain || getBaseDomainSync();
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://${subdomain}.${domain}`;
}

/**
 * Extrae el subdominio de un hostname
 */
export function extractSubdomain(hostname: string, baseDomain?: string): string | null {
  const domain = baseDomain || getBaseDomainSync();
  
  // Remover puerto si existe
  const cleanHostname = hostname.split(':')[0];
  
  // Si es localhost, retornar null
  if (cleanHostname.includes('localhost')) {
    return null;
  }
  
  // Si el hostname termina con el dominio base, extraer el subdominio
  if (cleanHostname.endsWith(`.${domain}`)) {
    const subdomain = cleanHostname.replace(`.${domain}`, '');
    return subdomain;
  }
  
  // Si el hostname es exactamente el dominio base, no hay subdominio
  if (cleanHostname === domain) {
    return null;
  }
  
  // En cualquier otro caso, asumir que la primera parte es el subdominio
  const parts = cleanHostname.split('.');
  return parts[0];
}
