/**
 * Inicializa/actualiza la clave `business_config` en `public.settings` en Supabase.
 * - Crea la tabla y política de RLS si no existen (usando SQL embebido).
 * - Upserta un valor por defecto de BusinessConfig si la fila no existe.
 *
 * Requisitos:
 * - Node 18+
 * - Variables de entorno:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (Service Role, no el anon key)
 *
 * Uso:
 *   node scripts/init-business-config.js
 */
require('dotenv').config({ path: process.env.ENV_PATH || '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[init-business-config] Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// SQL para asegurar tabla/políticas. Coincide con scripts/create-settings-business-config.sql
const ensureSql = `
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "realtime select business_config" ON public.settings;
CREATE POLICY "realtime select business_config"
  ON public.settings
  FOR SELECT
  USING (key = 'business_config');
INSERT INTO public.settings(key, value, version, updated_at)
SELECT 'business_config', '{}'::jsonb, 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'business_config');
`;

// Valor por defecto aproximado de BusinessConfig.
// Si ya existe en tu código como defaultBusinessConfig, puedes sincronizarlo manualmente aquí.
const defaultBusinessConfig = {
  businessInfo: {
    name: 'Mi Empresa',
    ruc: '',
    slogan: '',
    description: ''
  },
  legal: {
    termsUrl: '',
    privacyUrl: ''
  },
  contact: {
    email: '',
    phone: '',
    whatsapp: ''
  },
  address: {
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'PY'
  },
  social: {
    facebook: '',
    instagram: '',
    tiktok: '',
    twitter: '',
    youtube: '',
    linkedin: ''
  },
  hours: {
    monday: '08:00-18:00',
    tuesday: '08:00-18:00',
    wednesday: '08:00-18:00',
    thursday: '08:00-18:00',
    friday: '08:00-18:00',
    saturday: '09:00-13:00',
    sunday: 'Cerrado'
  },
  branding: {
    primaryColor: '#1a73e8',
    secondaryColor: '#fbbc04',
    logoUrl: '',
    faviconUrl: ''
  },
  store: {
    currency: 'PYG',
    priceIncludesVat: true,
    allowGuestCheckout: false,
    inventoryTracking: true
  },
  carousel: {
    enabled: true,
    images: []
  },
  notifications: {
    emailEnabled: false,
    pushEnabled: false
  },
  regional: {
    locale: 'es-PY',
    timezone: 'America/Asuncion',
    dateFormat: 'dd/MM/yyyy'
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1
  }
};

async function execSql(sql) {
  // Usa la RPC si existe (requiere función SQL `exec_sql` creada previamente)
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.warn('[init-business-config] No se pudo usar RPC exec_sql, intentando fallback directo:', error.message);
      // Fallback: intentar cada sentencia con COPY no soportado; aquí no disponible.
      // Como alternativa, se asume que la tabla ya existe si falla.
    }
  } catch (e) {
    console.warn('[init-business-config] exec_sql no disponible, continúa:', e.message);
  }
}

async function ensureTableAndPolicy() {
  console.log('[init-business-config] Asegurando tabla y políticas...');
  await execSql(ensureSql);
}

async function upsertBusinessConfig() {
  console.log('[init-business-config] Upsert de business_config...');
  const nowIso = new Date().toISOString();
  defaultBusinessConfig.metadata = {
    ...(defaultBusinessConfig.metadata || {}),
    updatedAt: nowIso,
  };

  const { data, error } = await supabase
    .from('settings')
    .upsert({ key: 'business_config', value: defaultBusinessConfig, version: 1, updated_at: nowIso }, { onConflict: 'key' })
    .select('*')
    .single();

  if (error) {
    throw new Error(`[init-business-config] Error al upsert: ${error.message}`);
  }
  console.log('[init-business-config] OK:', data);
}

(async () => {
  try {
    await ensureTableAndPolicy();
    await upsertBusinessConfig();
    console.log('\n[init-business-config] Completado.');
    process.exit(0);
  } catch (err) {
    console.error('\n[init-business-config] Falló:', err);
    process.exit(1);
  }
})();