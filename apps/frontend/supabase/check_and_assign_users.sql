-- ============================================================================
-- 1. VERIFICAR usuarios y sus organizaciones actuales
-- ============================================================================

-- Ver usuarios y sus emails
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email IN ('bfjeem@gmail.com', 'johneduardoespinoza95@gmail.com')
ORDER BY email;

-- Ver a qué organizaciones pertenecen actualmente
SELECT 
  u.email,
  o.name as organization_name,
  o.id as organization_id,
  om.role_id
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.email IN ('bfjeem@gmail.com', 'johneduardoespinoza95@gmail.com')
ORDER BY u.email;

-- ============================================================================
-- 2. Ver las organizaciones disponibles
-- ============================================================================

SELECT 
  id,
  name,
  slug
FROM organizations
ORDER BY name;

-- ============================================================================
-- 3. ASIGNAR usuarios a organizaciones diferentes
-- ============================================================================

-- Primero, obtén los IDs necesarios ejecutando estas queries:

-- ID de bfjeem@gmail.com
SELECT id FROM auth.users WHERE email = 'bfjeem@gmail.com';

-- ID de johneduardoespinoza95@gmail.com  
SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com';

-- ID de Empresa John Espinoza (org con productos de maquillaje)
SELECT id FROM organizations WHERE id = '2fac6ec5-53d4-493e-84df-24bf8a8a6666';

-- ID de Globex Corporation (org con productos de electrónica)
SELECT id FROM organizations WHERE id = '25a6adfc-5f2b-4486-af36-7f132658dd8d';

-- ID del rol (normalmente 'admin' o 'member')
SELECT id, name FROM roles ORDER BY name;

-- ============================================================================
-- 4. SCRIPT DE ASIGNACIÓN (REEMPLAZAR IDs)
-- ============================================================================

-- ⚠️ IMPORTANTE: Reemplaza los IDs con los valores reales de las queries anteriores

DO $$
DECLARE
  user_1_id uuid := 'REEMPLAZAR-CON-ID-bfjeem';
  user_2_id uuid := 'REEMPLAZAR-CON-ID-johneduardo';
  org_1_id uuid := '2fac6ec5-53d4-493e-84df-24bf8a8a6666'; -- Empresa John Espinoza
  org_2_id uuid := '25a6adfc-5f2b-4486-af36-7f132658dd8d'; -- Globex Corporation
  role_id uuid := 'REEMPLAZAR-CON-ID-ROLE'; -- Normalmente un rol "admin" o "member"
BEGIN
  
  -- Eliminar membresías existentes (para evitar duplicados)
  DELETE FROM organization_members 
  WHERE user_id IN (user_1_id, user_2_id);
  
  -- Asignar bfjeem@gmail.com a Empresa John Espinoza (productos de maquillaje)
  INSERT INTO organization_members (user_id, organization_id, role_id, created_at, updated_at)
  VALUES (user_1_id, org_1_id, role_id, NOW(), NOW());
  
  -- Asignar johneduardoespinoza95@gmail.com a Globex Corporation (productos de electrónica)
  INSERT INTO organization_members (user_id, organization_id, role_id, created_at, updated_at)
  VALUES (user_2_id, org_2_id, role_id, NOW(), NOW());
  
  RAISE NOTICE '✅ Usuarios asignados a organizaciones diferentes';
  RAISE NOTICE 'bfjeem@gmail.com → Empresa John Espinoza (14 productos maquillaje)';
  RAISE NOTICE 'johneduardoespinoza95@gmail.com → Globex Corporation (3 productos electrónica)';
  
END $$;

-- ============================================================================
-- 5. VERIFICAR la asignación
-- ============================================================================

SELECT 
  u.email,
  o.name as organization,
  COUNT(p.id) as productos_visibles
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.organization_id
LEFT JOIN products p ON p.organization_id = o.id
WHERE u.email IN ('bfjeem@gmail.com', 'johneduardoespinoza95@gmail.com')
GROUP BY u.email, o.name
ORDER BY u.email;
