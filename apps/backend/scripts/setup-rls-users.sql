-- =====================================================
-- Row Level Security (RLS) para tabla users
-- Sistema Multi-Tenant SaaS
-- =====================================================

-- Habilitar Row Level Security en tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICA: SELECT - Ver usuarios de la misma organización
-- =====================================================
CREATE POLICY "users_select_own_organization"
  ON users FOR SELECT
  USING (
    -- El usuario puede ver usuarios de su misma organización
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR
    -- SUPER_ADMIN puede ver todas las organizaciones
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'SUPER_ADMIN'
      AND ur.is_active = true
    )
  );

-- =====================================================
-- POLÍTICA: INSERT - Crear usuarios en la misma organización
-- =====================================================
CREATE POLICY "users_insert_own_organization"
  ON users FOR INSERT
  WITH CHECK (
    -- Solo puede crear usuarios en su misma organización
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR
    -- SUPER_ADMIN puede crear en cualquier organización
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'SUPER_ADMIN'
      AND ur.is_active = true
    )
  );

-- =====================================================
-- POLÍTICA: UPDATE - Actualizar usuarios de la misma organización
-- =====================================================
CREATE POLICY "users_update_own_organization"
  ON users FOR UPDATE
  USING (
    -- Solo puede actualizar usuarios de su misma organización
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR
    -- SUPER_ADMIN puede actualizar en cualquier organización
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'SUPER_ADMIN'
      AND ur.is_active = true
    )
  )
  WITH CHECK (
    -- No puede cambiar la organización a una diferente (excepto SUPER_ADMIN)
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'SUPER_ADMIN'
      AND ur.is_active = true
    )
  );

-- =====================================================
-- POLÍTICA: DELETE - Eliminar usuarios de la misma organización
-- =====================================================
CREATE POLICY "users_delete_own_organization"
  ON users FOR DELETE
  USING (
    -- Solo puede eliminar usuarios de su misma organización
    organization_id IN (
      SELECT organization_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR
    -- SUPER_ADMIN puede eliminar en cualquier organización
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'SUPER_ADMIN'
      AND ur.is_active = true
    )
  );

-- =====================================================
-- VERIFICACIÓN: Comprobar que las políticas están activas
-- =====================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Estas políticas se aplican a nivel de base de datos
-- 2. Funcionan en conjunto con las validaciones del backend
-- 3. SUPER_ADMIN tiene acceso completo a todas las organizaciones
-- 4. Los usuarios normales solo acceden a su organización
-- 5. No se puede cambiar la organización de un usuario (excepto SUPER_ADMIN)
-- 
-- Para desactivar RLS (solo para debugging):
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- 
-- Para eliminar todas las políticas:
-- DROP POLICY IF EXISTS "users_select_own_organization" ON users;
-- DROP POLICY IF EXISTS "users_insert_own_organization" ON users;
-- DROP POLICY IF EXISTS "users_update_own_organization" ON users;
-- DROP POLICY IF EXISTS "users_delete_own_organization" ON users;
