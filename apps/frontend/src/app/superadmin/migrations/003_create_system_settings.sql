-- Migration: Create system_settings table for global SuperAdmin configuration
-- This table stores global system settings that can be modified by SuperAdmins

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'general', 'security', 'notifications', 'backup'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_category ON public.system_settings(category);
CREATE INDEX idx_system_settings_is_active ON public.system_settings(is_active);

-- Insert default settings
INSERT INTO public.system_settings (key, value, category, description) VALUES
  -- General Settings
  ('system_name', '"MiPOS SaaS"', 'general', 'Nombre del sistema'),
  ('system_email', '"admin@mipos.com"', 'general', 'Email principal del sistema'),
  ('maintenance_mode', 'false', 'general', 'Modo de mantenimiento activo'),
  ('allow_registrations', 'true', 'general', 'Permitir nuevos registros'),
  
  -- Security Settings
  ('require_email_verification', 'true', 'security', 'Requerir verificación de email'),
  ('enable_two_factor', 'true', 'security', 'Habilitar autenticación de dos factores'),
  ('session_timeout', '30', 'security', 'Tiempo de sesión en minutos'),
  ('max_login_attempts', '5', 'security', 'Intentos máximos de login'),
  
  -- Notifications Settings
  ('enable_notifications', 'true', 'notifications', 'Habilitar notificaciones del sistema'),
  ('enable_email_notifications', 'true', 'notifications', 'Habilitar notificaciones por email'),
  ('enable_sms_notifications', 'false', 'notifications', 'Habilitar notificaciones por SMS'),
  
  -- Backup Settings
  ('backup_enabled', 'true', 'backup', 'Habilitar respaldos automáticos'),
  ('backup_frequency', '"daily"', 'backup', 'Frecuencia de respaldos'),
  ('data_retention_days', '90', 'backup', 'Días de retención de datos')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only SUPER_ADMIN can read/write settings
CREATE POLICY "SuperAdmin can manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Grant permissions
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Add comment
COMMENT ON TABLE public.system_settings IS 'Configuración global del sistema para SuperAdmins';
