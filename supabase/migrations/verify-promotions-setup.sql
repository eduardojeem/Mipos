SELECT '🔎 verifying tables' AS info;
SELECT table_name,
  CASE WHEN table_name IN ('promotions','promotions_products','promotions_carousel') THEN '✅ exists' ELSE '⚠️ optional' END AS status
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('promotions','promotions_products','promotions_carousel','carousel_audit_log')
ORDER BY table_name;

SELECT '🧱 verifying critical columns' AS info;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='promotions' AND column_name IN ('id','organization_id','is_active','start_date','end_date','deleted_at')
ORDER BY column_name;

SELECT '📚 verifying indexes' AS info;
SELECT tablename, indexname,
  CASE WHEN indexname LIKE 'idx_promotions_%' THEN '✅ custom'
       WHEN indexname LIKE '%_pkey' THEN '🔑 primary key'
       ELSE '📋 other' END AS type
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('promotions','promotions_products','promotions_carousel','carousel_audit_log')
ORDER BY tablename, indexname;

SELECT '🔒 verifying unique index' AS info;
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename='promotions_products' AND indexname='idx_promotions_products_unique';

SELECT '⚙️ verifying trigger' AS info;
SELECT trigger_name, event_manipulation, event_object_table, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema='public' AND trigger_name='enforce_carousel_limit';

SELECT '🧩 verifying function' AS info;
SELECT routine_name, routine_type, data_type AS return_type
FROM information_schema.routines
WHERE routine_schema='public' AND routine_name='check_carousel_limit';

SELECT '📈 counting records' AS info;
SELECT 'promotions' AS tabla, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_active=true) AS activas,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS eliminadas
FROM public.promotions
UNION ALL
SELECT 'promotions_products' AS tabla, COUNT(*) AS total, NULL AS activas, NULL AS eliminadas
FROM public.promotions_products
UNION ALL
SELECT 'promotions_carousel' AS tabla, COUNT(*) AS total, NULL AS activas, NULL AS eliminadas
FROM public.promotions_carousel;

SELECT '🧪 checking duplicates' AS info;
SELECT promotion_id, product_id, organization_id, COUNT(*) AS duplicados
FROM public.promotions_products
GROUP BY promotion_id, product_id, organization_id
HAVING COUNT(*) > 1;

SELECT '📦 index sizes' AS info;
SELECT schemaname, relname AS tablename, indexrelname AS indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname='public' AND relname IN ('promotions','promotions_products','promotions_carousel','carousel_audit_log')
ORDER BY pg_relation_size(indexrelid) DESC;

SELECT '🚀 index usage (recent stats)' AS info;
SELECT schemaname, relname AS tablename, indexrelname AS indexname, idx_scan AS scans, idx_tup_read AS tuples_read, idx_tup_fetch AS tuples_fetch
FROM pg_stat_user_indexes
WHERE schemaname='public' AND relname IN ('promotions','promotions_products','promotions_carousel') AND indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;

SELECT '🛡️ RLS status' AS info;
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname='public' AND tablename IN ('promotions','promotions_products','promotions_carousel');

DO $$
DECLARE promotions_exists boolean;
DECLARE deleted_at_exists boolean;
DECLARE unique_index_exists boolean;
DECLARE trigger_exists boolean;
DECLARE issues_count integer := 0;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='promotions') INTO promotions_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promotions' AND column_name='deleted_at') INTO deleted_at_exists;
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_promotions_products_unique') INTO unique_index_exists;
  SELECT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name='enforce_carousel_limit') INTO trigger_exists;
  RAISE NOTICE '✅ promotions table: %', CASE WHEN promotions_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '✅ deleted_at column: %', CASE WHEN deleted_at_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '✅ unique index: %', CASE WHEN unique_index_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '✅ carousel limit trigger: %', CASE WHEN trigger_exists THEN 'OK' ELSE 'MISSING' END;
  IF NOT promotions_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT deleted_at_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT unique_index_exists THEN issues_count := issues_count + 1; END IF;
  IF NOT trigger_exists THEN issues_count := issues_count + 1; END IF;
  IF issues_count = 0 THEN
    RAISE NOTICE '🎉 setup complete';
  ELSE
    RAISE NOTICE '⚠️ issues found: %', issues_count;
  END IF;
END
$$;
