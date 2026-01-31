-- ============================================================================
-- Script de Auditoría de Base de Datos - Mipos Multitenancy
-- ============================================================================
-- Descripción: Verifica qué tablas y columnas existen en tu base de datos
--              y genera un reporte de lo que falta para multitenancy
-- Uso: Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar tablas existentes
-- ============================================================================

SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- PASO 2: Verificar estructura de tablas críticas
-- ============================================================================

-- ORGANIZATIONS
SELECT 
  'organizations' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- ORGANIZATION_MEMBERS
SELECT 
  'organization_members' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- PRODUCTS
SELECT 
  'products' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- CATEGORIES
SELECT 
  'categories' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'categories'
ORDER BY ordinal_position;

-- CUSTOMERS
SELECT 
  'customers' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- SALES
SELECT 
  'sales' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'sales'
ORDER BY ordinal_position;

-- SUPPLIERS
SELECT 
  'suppliers' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'suppliers'
ORDER BY ordinal_position;

-- PROMOTIONS
SELECT 
  'promotions' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'promotions'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 3: Verificar columna organization_id en todas las tablas
-- ============================================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'organization_id'
ORDER BY table_name;

-- ============================================================================
-- PASO 4: Verificar índices en organization_id
-- ============================================================================

SELECT 
  t.relname AS table_name,
  i.relname AS index_name,
  a.attname AS column_name
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relkind = 'r'
  AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND a.attname = 'organization_id'
ORDER BY t.relname, i.relname;

-- ============================================================================
-- PASO 5: Verificar Row Level Security (RLS)
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'products', 'categories', 'customers', 'sales', 
    'suppliers', 'promotions', 'inventory_movements', 'orders'
  )
ORDER BY tablename;

-- ============================================================================
-- PASO 6: Verificar políticas RLS existentes
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PASO 7: Verificar Foreign Keys críticas
-- ============================================================================

SELECT
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'products', 'categories', 'customers', 'sales',
    'organization_members', 'suppliers', 'promotions'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- PASO 8: Reporte resumido
-- ============================================================================

-- Tablas principales requeridas
DO $$
DECLARE
  required_tables text[] := ARRAY[
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
  ];
  current_table text;
  table_exists boolean;
  missing_tables text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REPORTE DE AUDITORÍA DE BASE DE DATOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH current_table IN ARRAY required_tables
  LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = current_table
    ) INTO table_exists;
    
    IF table_exists THEN
      RAISE NOTICE '✅ Tabla existe: %', current_table;
    ELSE
      RAISE NOTICE '❌ Tabla FALTA: %', current_table;
      missing_tables := array_append(missing_tables, current_table);
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE '⚠️  Tablas faltantes: %', missing_tables;
  ELSE
    RAISE NOTICE '✅ Todas las tablas principales existen';
  END IF;
END $$;

-- ============================================================================
-- PASO 9: Verificar columnas críticas organization_id
-- ============================================================================

DO $$
DECLARE
  tables_needing_org_id text[] := ARRAY[
    'products',
    'categories',
    'customers',
    'sales',
    'suppliers',
    'promotions'
  ];
  current_table text;
  has_org_id boolean;
  tables_missing_org_id text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN organization_id';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOREACH current_table IN ARRAY tables_needing_org_id
  LOOP
    -- Check if table exists first
    IF EXISTS (
      SELECT FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = current_table
    ) THEN
      SELECT EXISTS (
        SELECT FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.table_name = current_table
        AND c.column_name = 'organization_id'
      ) INTO has_org_id;
      
      IF has_org_id THEN
        RAISE NOTICE '✅ % tiene organization_id', current_table;
      ELSE
        RAISE NOTICE '❌ % FALTA organization_id', current_table;
        tables_missing_org_id := array_append(tables_missing_org_id, current_table);
      END IF;
    ELSE
      RAISE NOTICE '⚠️  % no existe', current_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  
  IF array_length(tables_missing_org_id, 1) > 0 THEN
    RAISE NOTICE '⚠️  Tablas sin organization_id: %', tables_missing_org_id;
  ELSE
    RAISE NOTICE '✅ Todas las tablas tienen organization_id';
  END IF;
END $$;

-- ============================================================================
-- PASO 10: Conteo de datos por tabla
-- ============================================================================

DO $$
DECLARE
  table_record RECORD;
  row_count bigint;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONTEO DE REGISTROS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'organizations', 'organization_members', 'products', 
        'categories', 'customers', 'sales', 'users'
      )
    ORDER BY table_name
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO row_count;
    RAISE NOTICE '% : % registros', RPAD(table_record.table_name, 25), row_count;
  END LOOP;
END $$;
