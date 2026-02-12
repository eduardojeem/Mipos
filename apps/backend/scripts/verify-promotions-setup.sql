-- ============================================================
-- Verificación de Setup de Promociones
-- ============================================================
-- Fecha: 2026-02-11
-- Propósito: Verificar que todos los índices y estructuras estén correctos
-- ============================================================

\echo '============================================================'
\echo 'VERIFICACIÓN DE SETUP DE PROMOCIONES'
\echo '============================================================'
\echo ''

-- 1. Verificar existencia de tablas
-- ============================================================

\echo '1. VERIFICANDO TABLAS...'
\echo ''

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('promotions', 'promotions_products', 'promotions_carousel') 
    THEN '✅ EXISTE'
    ELSE '⚠️  OPCIONAL'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY table_name;

\echo ''


-- 2. Verificar columnas importantes
-- ============================================================

\echo '2. VERIFICANDO COLUMNAS IMPORTANTES...'
\echo ''

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'promotions'
  AND column_name IN ('id', 'organization_id', 'is_active', 'start_date', 'end_date', 'deleted_at')
ORDER BY 
  CASE column_name
    WHEN 'id' THEN 1
    WHEN 'organization_id' THEN 2
    WHEN 'is_active' THEN 3
    WHEN 'start_date' THEN 4
    WHEN 'end_date' THEN 5
    WHEN 'deleted_at' THEN 6
  END;

\echo ''


-- 3. Verificar índices creados
-- ============================================================

\echo '3. VERIFICANDO ÍNDICES...'
\echo ''

SELECT 
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE 'idx_promotions_%' THEN '✅ CUSTOM'
    WHEN indexname LIKE '%_pkey' THEN '🔑 PRIMARY KEY'
    ELSE '📋 OTRO'
  END as tipo
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY tablename, indexname;

\echo ''


-- 4. Verificar índice único en promotions_products
-- ============================================================

\echo '4. VERIFICANDO ÍNDICE ÚNICO...'
\echo ''

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'promotions_products'
  AND indexname = 'idx_promotions_products_unique';

\echo ''


-- 5. Verificar trigger de límite de carrusel
-- ============================================================

\echo '5. VERIFICANDO TRIGGER DE CARRUSEL...'
\echo ''

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'enforce_carousel_limit';

\echo ''


-- 6. Verificar función de límite de carrusel
-- ============================================================

\echo '6. VERIFICANDO FUNCIÓN DE LÍMITE...'
\echo ''

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_carousel_limit';

\echo ''


-- 7. Contar registros en tablas
-- ============================================================

\echo '7. CONTANDO REGISTROS...'
\echo ''

SELECT 
  'promotions' as tabla,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as activas,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as eliminadas
FROM promotions
UNION ALL
SELECT 
  'promotions_products' as tabla,
  COUNT(*) as total,
  NULL as activas,
  NULL as eliminadas
FROM promotions_products
UNION ALL
SELECT 
  'promotions_carousel' as tabla,
  COUNT(*) as total,
  NULL as activas,
  NULL as eliminadas
FROM promotions_carousel;

\echo ''


-- 8. Verificar duplicados en promotions_products
-- ============================================================

\echo '8. VERIFICANDO DUPLICADOS...'
\echo ''

SELECT 
  promotion_id,
  product_id,
  organization_id,
  COUNT(*) as duplicados
FROM promotions_products
GROUP BY promotion_id, product_id, organization_id
HAVING COUNT(*) > 1;

\echo ''
\echo 'Si no hay resultados, no hay duplicados ✅'
\echo ''


-- 9. Verificar tamaño de índices
-- ============================================================

\echo '9. TAMAÑO DE ÍNDICES...'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS tamaño
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY pg_relation_size(indexrelid) DESC;

\echo ''


-- 10. Verificar uso de índices
-- ============================================================

\echo '10. USO DE ÍNDICES (últimas estadísticas)...'
\echo ''

SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as escaneos,
  idx_tup_read as tuplas_leidas,
  idx_tup_fetch as tuplas_obtenidas
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'promotions_products', 'promotions_carousel')
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

\echo ''


-- 11. Verificar permisos RLS (Row Level Security)
-- ============================================================

\echo '11. VERIFICANDO RLS...'
\echo ''

SELECT 
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'promotions_products', 'promotions_carousel');

\echo ''


-- 12. Resumen de verificación
-- ============================================================

\echo '============================================================'
\echo 'RESUMEN DE VERIFICACIÓN'
\echo '============================================================'
\echo ''

DO $$
DECLARE
  promotions_exists boolean;
  deleted_at_exists boolean;
  unique_index_exists boolean;
  trigger_exists boolean;
  issues_count integer := 0;
BEGIN
  -- Verificar tabla promotions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'promotions'
  ) INTO promotions_exists;
  
  -- Verificar columna deleted_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' AND column_name = 'deleted_at'
  ) INTO deleted_at_exists;
  
  -- Verificar índice único
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_promotions_products_unique'
  ) INTO unique_index_exists;
  
  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'enforce_carousel_limit'
  ) INTO trigger_exists;
  
  -- Mostrar resultados
  RAISE NOTICE '✅ Tabla promotions: %', CASE WHEN promotions_exists THEN 'OK' ELSE 'FALTA' END;
  RAISE NOTICE '✅ Columna deleted_at: %', CASE WHEN deleted_at_exists THEN 'OK' ELSE 'FALTA' END;
  RAISE NOTICE '✅ Índice único: %', CASE WHEN unique_index_exists THEN 'OK' ELSE 'FALTA' END;
  RAISE NOTICE '✅ Trigger de límite: %', CASE WHEN trigger_exists THEN 'OK' ELSE 'FALTA' END;
  
  -- Contar issues
  IF NOT promotions_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT deleted_at_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT unique_index_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT trigger_exists THEN issues_count := issues_count + 1; END IF;
  
  RAISE NOTICE '';
  IF issues_count = 0 THEN
    RAISE NOTICE '🎉 SETUP COMPLETO - Todo está correcto!';
  ELSE
    RAISE NOTICE '⚠️  ISSUES ENCONTRADOS: %', issues_count;
    RAISE NOTICE 'Ejecuta: psql -d your_database -f apps/backend/scripts/add-promotions-indexes-safe.sql';
  END IF;
END
$$;

\echo ''
\echo '============================================================'
\echo 'FIN DE VERIFICACIÓN'
\echo '============================================================'
