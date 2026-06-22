import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Feature flags centralizados del SaaS.
 *
 * Se persisten en `system_settings` bajo la key `feature_flags` como un objeto
 * JSON { [flagKey]: boolean }. El SuperAdmin los gestiona desde
 * /superadmin/settings (tab "Feature Flags"). El resto del código consume el
 * estado con `isFeatureEnabled()` / `getFeatureFlags()`.
 *
 * Catálogo de flags conocidos. Agregar acá un flag lo hace aparecer en el panel
 * con su descripción y valor por defecto, aunque todavía no exista en la DB.
 */
export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAG_CATALOG: FeatureFlagDefinition[] = [
  {
    key: 'marketplace_public',
    label: 'Marketplace público',
    description: 'Habilita el marketplace público (/home) para todos los tenants.',
    defaultValue: true,
  },
  {
    key: 'public_registration',
    label: 'Auto-registro de empresas',
    description: 'Permite que nuevas organizaciones se registren solas desde la web.',
    defaultValue: true,
  },
  {
    key: 'online_orders',
    label: 'Pedidos online',
    description: 'Activa la recepción de pedidos online en las tiendas públicas.',
    defaultValue: true,
  },
  {
    key: 'loyalty_program',
    label: 'Programa de fidelidad',
    description: 'Habilita puntos y recompensas de fidelidad a nivel plataforma.',
    defaultValue: false,
  },
  {
    key: 'barbershop_vertical',
    label: 'Vertical barbería',
    description: 'Habilita el vertical de barbería (servicios, profesionales, agenda).',
    defaultValue: false,
  },
];

const CACHE_TTL_MS = 30 * 1000;
let cache: { flags: Record<string, boolean>; expiresAt: number } | null = null;

function withDefaults(stored: Record<string, boolean> | null | undefined): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const def of FEATURE_FLAG_CATALOG) {
    result[def.key] = stored?.[def.key] ?? def.defaultValue;
  }
  // Conservar flags almacenados que no estén en el catálogo (forward-compat).
  if (stored) {
    for (const [key, value] of Object.entries(stored)) {
      if (!(key in result)) result[key] = Boolean(value);
    }
  }
  return result;
}

/**
 * Devuelve el mapa completo de flags (catálogo + overrides de DB), cacheado.
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.flags;
  }

  let stored: Record<string, boolean> | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'feature_flags')
      .maybeSingle();
    const raw = (data?.value as any) ?? null;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      stored = raw as Record<string, boolean>;
    }
  } catch {
    // Fail-open: ante error de DB, usar los valores por defecto del catálogo.
  }

  const flags = withDefaults(stored);
  cache = { flags, expiresAt: Date.now() + CACHE_TTL_MS };
  return flags;
}

/**
 * True si el flag está activo. Flags desconocidos devuelven `false`.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return Boolean(flags[key]);
}

/** Invalida la caché en memoria (llamar tras guardar flags). */
export function invalidateFeatureFlagsCache(): void {
  cache = null;
}
