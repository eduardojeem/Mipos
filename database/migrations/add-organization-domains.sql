-- =====================================================
-- MIGRACIÓN: Agregar soporte de dominios a organizaciones
-- Fecha: 2026-02-05
-- Objetivo: Habilitar subdominios y dominios personalizados para SaaS multitenancy
-- =====================================================

-- 1. Agregar campos de dominio a organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false;

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON organizations(custom_domain);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- 3. Generar subdomains para organizaciones existentes (basado en slug)
UPDATE organizations
SET subdomain = slug
WHERE subdomain IS NULL AND slug IS NOT NULL;

-- 4. Crear tabla para dominios personalizados múltiples (opcional, para feature premium)
CREATE TABLE IF NOT EXISTS organization_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  ssl_certificate TEXT,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices para organization_domains
CREATE INDEX IF NOT EXISTS idx_org_domains_org_id ON organization_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_domains_domain ON organization_domains(domain);
CREATE INDEX IF NOT EXISTS idx_org_domains_verified ON organization_domains(is_verified);

-- 6. RLS para organization_domains
ALTER TABLE organization_domains ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si existen (para idempotencia)
DROP POLICY IF EXISTS "Super Admin can view all domains" ON organization_domains;
DROP POLICY IF EXISTS "Users can view their organization domains" ON organization_domains;
DROP POLICY IF EXISTS "Super Admin can manage all domains" ON organization_domains;

-- Super Admin puede ver todos los dominios
CREATE POLICY "Super Admin can view all domains"
ON organization_domains FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
  )
);

-- Usuarios pueden ver dominios de su organización
CREATE POLICY "Users can view their organization domains"
ON organization_domains FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Super Admin puede gestionar todos los dominios
CREATE POLICY "Super Admin can manage all domains"
ON organization_domains FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
  )
);

-- 7. Verificar que todas las tablas públicas tienen organization_id
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(table_name)
  INTO missing_tables
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN ('products', 'categories', 'promotions', 'orders', 'settings')
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = t.table_name
    AND c.column_name = 'organization_id'
  );

  IF missing_tables IS NOT NULL THEN
    RAISE WARNING 'Las siguientes tablas NO tienen organization_id: %', missing_tables;
  ELSE
    RAISE NOTICE '✅ Todas las tablas públicas tienen organization_id';
  END IF;
END $$;

-- 8. Comentarios para documentación
COMMENT ON COLUMN organizations.subdomain IS 'Subdominio para acceso público (ej: empresa-a.tudominio.com)';
COMMENT ON COLUMN organizations.custom_domain IS 'Dominio personalizado principal (ej: www.empresa-a.com)';
COMMENT ON COLUMN organizations.domain_verified IS 'Indica si el dominio personalizado está verificado';
COMMENT ON TABLE organization_domains IS 'Tabla para gestionar múltiples dominios personalizados por organización (feature premium)';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
