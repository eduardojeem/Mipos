// Centraliza detección de entorno Supabase y modo mock para el frontend

export function isMissingOrPlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  const placeholderPatterns = [
    // Variantes comunes en el repo
    'tu_proyecto_ref',
    'tu_anon_key',
    'your_supabase_url',
    'your_supabase_anon_key',
    'your-supabase-url',
    'your-supabase-key',
    'replace-with-your',
    'reemplaza',
    'replace',
    'placeholder',
    'example.com',
  ];
  if (placeholderPatterns.some((p) => lower.includes(p))) return true;
  // Supabase anon/service keys tienen forma JWT; detecta obvios inválidos
  const looksLikeKey = /^(?:[A-Za-z0-9_\-]+)\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(v);
  // Si no parece JWT y no es URL, tratar como inválido
  if (!looksLikeKey && !/^https?:\/\//.test(v)) return true;
  return false;
}

// Indica si el frontend tiene configuración válida de Supabase (URL y anon key)
export function isSupabaseActive(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !isMissingOrPlaceholder(url) && !isMissingOrPlaceholder(anonKey);
}

// Habilita auth/mock cuando Supabase no está configurado o se fuerza explícitamente
export function isMockAuthEnabled(): boolean {
  const explicitMock = process.env.MOCK_AUTH === 'true';
  return explicitMock || !isSupabaseActive();
}

// Resumen del modo de entorno para propagar en cabeceras
export function getEnvMode(): 'prod' | 'mock' {
  return isMockAuthEnabled() ? 'mock' : 'prod';
}

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isMissingOrPlaceholder(publicUrl) && !isMissingOrPlaceholder(publicAnon)) {
    return { url: publicUrl as string, anonKey: publicAnon as string };
  }
  const serverUrl = process.env.SUPABASE_URL;
  const serverAnon = process.env.SUPABASE_ANON_KEY;
  if (!isMissingOrPlaceholder(serverUrl) && !isMissingOrPlaceholder(serverAnon)) {
    return { url: serverUrl as string, anonKey: serverAnon as string };
  }
  return null;
}

export function getSupabaseAdminConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isMissingOrPlaceholder(url) && !isMissingOrPlaceholder(key)) {
    return { url: url as string, serviceRoleKey: key as string };
  }
  return null;
}

// Stock thresholds configuration (front-end defaults)
export function getStockThresholds(): { low: number; critical: number } {
  const lowEnv = Number(process.env.NEXT_PUBLIC_LOW_STOCK_THRESHOLD || 0);
  const criticalEnv = Number(process.env.NEXT_PUBLIC_CRITICAL_STOCK_THRESHOLD || 0);
  const low = Number.isFinite(lowEnv) && lowEnv > 0 ? lowEnv : 5;
  const critical = Number.isFinite(criticalEnv) && criticalEnv > 0 ? criticalEnv : 2;
  return { low, critical };
}
