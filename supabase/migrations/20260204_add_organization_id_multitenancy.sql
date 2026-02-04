-- =====================================================
-- Migración: Agregar organization_id para Multitenancy
-- Fecha: 2026-02-04
-- Descripción: Agrega columna organization_id a tablas
--              críticas y actualiza políticas RLS
-- =====================================================

-- =====================================================
-- 1. AGREGAR COLUMNAS organization_id
-- =====================================================

-- 1.1 Tabla: audit_logs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1.2 Tabla: promotions
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
    ALTER TABLE promotions 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1.3 Tabla: coupons (opcional - solo si existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    ALTER TABLE coupons 
    ADD COLUMN IF NOT EXISTS organization_id UUID 
    REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id 
    ON audit_logs(organization_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
    CREATE INDEX IF NOT EXISTS idx_promotions_organization_id 
    ON promotions(organization_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    CREATE INDEX IF NOT EXISTS idx_coupons_organization_id 
    ON coupons(organization_id);
  END IF;
END $$;

-- =====================================================
-- 3. BACKFILL DATOS EXISTENTES (OPCIONAL)
-- =====================================================
-- Nota: Descomentar si necesitas asignar datos existentes
--       a una organización específica

-- Ejemplo: Asignar todos los registros sin org a la primera org
-- UPDATE audit_logs 
-- SET organization_id = (SELECT id FROM organizations LIMIT 1)
-- WHERE organization_id IS NULL;

-- UPDATE promotions 
-- SET organization_id = (SELECT id FROM organizations LIMIT 1)
-- WHERE organization_id IS NULL;

-- UPDATE coupons 
-- SET organization_id = (SELECT id FROM organizations LIMIT 1)
-- WHERE organization_id IS NULL;

-- =====================================================
-- 4. FUNCIONES HELPER PARA RLS
-- =====================================================

-- Función: Verificar si el usuario es super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener IDs de organizaciones del usuario
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id 
    FROM organization_members
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ACTUALIZAR POLÍTICAS RLS - audit_logs
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Tenant Isolation" ON audit_logs;
DROP POLICY IF EXISTS "Admins can manage org data" ON audit_logs;
DROP POLICY IF EXISTS "Super admins can view all" ON audit_logs;

-- Política: Lectura con aislamiento de tenant
CREATE POLICY "Tenant Isolation" ON audit_logs
  FOR SELECT USING (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- Política: Inserción solo para miembros de la org
CREATE POLICY "Admins can insert org data" ON audit_logs
  FOR INSERT WITH CHECK (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- =====================================================
-- 6. ACTUALIZAR POLÍTICAS RLS - promotions
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Tenant Isolation" ON promotions;
DROP POLICY IF EXISTS "Admins can manage org data" ON promotions;
DROP POLICY IF EXISTS "Super admins can manage all" ON promotions;

-- Política: Lectura con aislamiento de tenant
CREATE POLICY "Tenant Isolation" ON promotions
  FOR SELECT USING (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- Política: Inserción solo para miembros de la org
CREATE POLICY "Admins can insert org data" ON promotions
  FOR INSERT WITH CHECK (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- Política: Actualización solo para miembros de la org
CREATE POLICY "Admins can update org data" ON promotions
  FOR UPDATE USING (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- Política: Eliminación solo para miembros de la org
CREATE POLICY "Admins can delete org data" ON promotions
  FOR DELETE USING (
    is_super_admin() OR 
    organization_id IN (SELECT unnest(get_my_org_ids()))
  );

-- =====================================================
-- 7. ACTUALIZAR POLÍTICAS RLS - coupons (solo si existe)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
    -- Eliminar políticas existentes
    DROP POLICY IF EXISTS "Tenant Isolation" ON coupons;
    DROP POLICY IF EXISTS "Admins can manage org data" ON coupons;
    DROP POLICY IF EXISTS "Super admins can manage all" ON coupons;

    -- Política: Lectura con aislamiento de tenant
    EXECUTE 'CREATE POLICY "Tenant Isolation" ON coupons
      FOR SELECT USING (
        is_super_admin() OR 
        organization_id IN (SELECT unnest(get_my_org_ids()))
      )';

    -- Política: Inserción solo para miembros de la org
    EXECUTE 'CREATE POLICY "Admins can insert org data" ON coupons
      FOR INSERT WITH CHECK (
        is_super_admin() OR 
        organization_id IN (SELECT unnest(get_my_org_ids()))
      )';

    -- Política: Actualización solo para miembros de la org
    EXECUTE 'CREATE POLICY "Admins can update org data" ON coupons
      FOR UPDATE USING (
        is_super_admin() OR 
        organization_id IN (SELECT unnest(get_my_org_ids()))
      )';

    -- Política: Eliminación solo para miembros de la org
    EXECUTE 'CREATE POLICY "Admins can delete org data" ON coupons
      FOR DELETE USING (
        is_super_admin() OR 
        organization_id IN (SELECT unnest(get_my_org_ids()))
      )';
  END IF;
END $$;

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
DO $$
DECLARE
  audit_logs_exists BOOLEAN;
  promotions_exists BOOLEAN;
  coupons_exists BOOLEAN;
BEGIN
  -- Verificar audit_logs
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'organization_id'
  ) INTO audit_logs_exists;

  IF NOT audit_logs_exists THEN
    RAISE WARNING 'Columna organization_id no existe en audit_logs (tabla puede no existir)';
  ELSE
    RAISE NOTICE '✓ Columna organization_id agregada a audit_logs';
  END IF;

  -- Verificar promotions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' AND column_name = 'organization_id'
  ) INTO promotions_exists;

  IF NOT promotions_exists THEN
    RAISE WARNING 'Columna organization_id no existe en promotions (tabla puede no existir)';
  ELSE
    RAISE NOTICE '✓ Columna organization_id agregada a promotions';
  END IF;

  -- Verificar coupons (opcional)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coupons' AND column_name = 'organization_id'
  ) INTO coupons_exists;

  IF coupons_exists THEN
    RAISE NOTICE '✓ Columna organization_id agregada a coupons';
  ELSE
    RAISE NOTICE 'ℹ Tabla coupons no existe - omitida';
  END IF;

  RAISE NOTICE 'Migración completada exitosamente';
END $$;
