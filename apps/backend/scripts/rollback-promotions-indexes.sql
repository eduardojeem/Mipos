-- ============================================================
-- Rollback de Índices de Promociones
-- ============================================================
-- Fecha: 2026-02-11
-- Propósito: Revertir cambios de add-promotions-indexes.sql
-- Uso: Solo ejecutar si es necesario revertir los cambios
-- ============================================================

-- ADVERTENCIA: Este script eliminará índices que mejoran el performance
-- Solo ejecutar si hay problemas con los índices creados

BEGIN;

-- Eliminar índices de promotions
-- ============================================================

DROP INDEX IF EXISTS idx_promotions_org_active;
DROP INDEX IF EXISTS idx_promotions_dates;
DROP INDEX IF EXISTS idx_promotions_active_dates;
DROP INDEX IF EXISTS idx_promotions_deleted;

RAISE NOTICE 'Índices de promotions eliminados';


-- Eliminar índices de promotions_products
-- ============================================================

DROP INDEX IF EXISTS idx_promotions_products_promo_org;
DROP INDEX IF EXISTS idx_promotions_products_product_org;
DROP INDEX IF EXISTS idx_promotions_products_org;
DROP INDEX IF EXISTS idx_promotions_products_unique;

RAISE NOTICE 'Índices de promotions_products eliminados';


-- Eliminar índices de promotions_carousel
-- ============================================================

DROP INDEX IF EXISTS idx_promotions_carousel_org_position;
DROP INDEX IF EXISTS idx_promotions_carousel_promotion;

RAISE NOTICE 'Índices de promotions_carousel eliminados';


-- Eliminar índices de carousel_audit_log
-- ============================================================

DROP INDEX IF EXISTS idx_carousel_audit_user;
DROP INDEX IF EXISTS idx_carousel_audit_created;
DROP INDEX IF EXISTS idx_carousel_audit_action;

RAISE NOTICE 'Índices de carousel_audit_log eliminados';


-- Eliminar trigger y función
-- ============================================================

DROP TRIGGER IF EXISTS enforce_carousel_limit ON promotions_carousel;
DROP FUNCTION IF EXISTS check_carousel_limit();

RAISE NOTICE 'Trigger y función de límite de carrusel eliminados';


-- NOTA: La columna deleted_at NO se elimina por seguridad
-- Si deseas eliminarla, ejecuta manualmente:
-- ALTER TABLE promotions DROP COLUMN IF EXISTS deleted_at;

COMMIT;

-- Verificar que los índices fueron eliminados
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
  AND schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================
-- Fin del script de rollback
-- ============================================================
