-- =====================================================
-- CONFIGURACIÓN: base_domain para sistema SaaS
-- Descripción: Inserta configuración de dominio base en tabla existente
-- =====================================================

-- La tabla system_settings ya existe con esta estructura:
-- id UUID PRIMARY KEY
-- key VARCHAR(255) NOT NULL UNIQUE
-- value JSONB NOT NULL
-- category VARCHAR(100) NOT NULL
-- description TEXT
-- is_active BOOLEAN DEFAULT true
-- created_at TIMESTAMPTZ DEFAULT now()
-- updated_at TIMESTAMPTZ DEFAULT now()
-- created_by UUID REFERENCES auth.users(id)
-- updated_by UUID REFERENCES auth.users(id)

-- Insertar configuración de dominio base
INSERT INTO system_settings (key, value, category, description, is_active)
VALUES (
  'base_domain',
  '{"domain": "miposparaguay.vercel.app"}'::jsonb,
  'general',
  'Dominio base del sistema SaaS para subdominios de organizaciones',
  true
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verificar que se insertó correctamente
SELECT key, value, category, description, is_active, created_at, updated_at
FROM system_settings
WHERE key = 'base_domain';
