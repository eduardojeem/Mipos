-- 031_create_system_settings.sql
--
-- Crea la tabla public.system_settings, que el código asumía existente pero
-- nunca tuvo un CREATE TABLE en migraciones. Su ausencia produce el error
-- "Could not find the table 'public.system_settings' in the schema cache" en
-- /superadmin/settings, base_domain, modo mantenimiento y feature flags.
--
-- Estructura alineada con la documentada en database/migrations/create-system-settings-table.sql
-- (id, key, value jsonb, category, description, is_active, timestamps, *_by).

CREATE TABLE IF NOT EXISTS public.system_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       jsonb NOT NULL,
  category    text NOT NULL DEFAULT 'general',
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  updated_by  uuid
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_system_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_system_settings_updated_at();

-- RLS: la config no es secreta (dominio, flags, toggles), así que se permite
-- lectura pública (necesaria para getBaseDomain y el chequeo de mantenimiento
-- en contexto anónimo). La escritura queda restringida a SUPER_ADMIN; igual las
-- APIs escriben con service role, que bypassea RLS.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings public read" ON public.system_settings;
CREATE POLICY "system_settings public read"
  ON public.system_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "system_settings superadmin write" ON public.system_settings;
CREATE POLICY "system_settings superadmin write"
  ON public.system_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'SUPER_ADMIN'));

-- Semilla con los valores por defecto que espera el panel.
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('base_domain',         '{"domain":"miposparaguay.vercel.app"}'::jsonb, 'general',  'Dominio base del sistema SaaS para subdominios'),
  ('system_name',         '"MiPOS SaaS"'::jsonb,                          'general',  'Nombre visible del sistema'),
  ('system_email',        '"admin@mipos.com"'::jsonb,                     'general',  'Email principal del sistema'),
  ('maintenance_mode',    'false'::jsonb,                                 'general',  'Modo mantenimiento global'),
  ('allow_registrations', 'true'::jsonb,                                  'general',  'Permitir auto-registro de organizaciones'),
  ('session_timeout',     '30'::jsonb,                                    'security', 'Tiempo de sesión en minutos'),
  ('max_login_attempts',  '5'::jsonb,                                     'security', 'Intentos máximos de login'),
  ('enable_notifications','true'::jsonb,                                  'notifications', 'Notificaciones generales'),
  ('enable_email_notifications','true'::jsonb,                            'notifications', 'Notificaciones por email'),
  ('enable_sms_notifications','false'::jsonb,                             'notifications', 'Notificaciones SMS'),
  ('data_retention_days', '90'::jsonb,                                    'data',     'Días de retención de datos'),
  ('feature_flags',       '{}'::jsonb,                                    'features', 'Feature flags del SaaS')
ON CONFLICT (key) DO NOTHING;

-- Forzar a PostgREST a recargar el esquema (limpia el "schema cache" del error).
NOTIFY pgrst, 'reload schema';
