-- ============================================================================
-- Auditoría Simple - Resultados en Tablas
-- ============================================================================

-- 1. ¿Qué tablas PRINCIPALES existen?
SELECT 
  CASE 
    WHEN table_name IN ('organizations', 'organization_members', 'products', 'categories', 'customers', 'sales', 'suppliers', 'promotions', 'users', 'user_roles') 
    THEN '✅ Existe'
    ELSE '⚠️ Extra'
  END as status,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. ¿Qué tablas NECESARIAS faltan?
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'organizations',
    'organization_members', 
    'products',
    'categories',
    'customers',
    'sales',
    'suppliers',
    'promotions',
    'users',
    'user_roles'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
)
SELECT 
  '❌ FALTA' as status,
  r.table_name
FROM required_tables r
LEFT JOIN existing_tables e ON r.table_name = e.table_name
WHERE e.table_name IS NULL;

-- 3. ¿Qué tablas tienen organization_id?
SELECT 
  t.table_name,
  CASE 
    WHEN c.column_name IS NOT NULL THEN '✅ Tiene org_id'
    ELSE '❌ FALTA org_id'
  END as tiene_organization_id,
  c.data_type as tipo_dato
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND c.column_name = 'organization_id'
  AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN ('products', 'categories', 'customers', 'sales', 'suppliers', 'promotions')
ORDER BY t.table_name;

-- 4. Conteo de registros
SELECT 
  'organizations' as tabla,
  COUNT(*) as total_registros
FROM organizations
UNION ALL
SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
ORDER BY tabla;

-- 5. ¿Tiene RLS habilitado?
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Deshabilitado'
  END as estado_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'categories', 'customers', 'sales', 'suppliers', 'promotions')
ORDER BY tablename;
