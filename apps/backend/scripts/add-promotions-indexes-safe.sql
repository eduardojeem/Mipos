-- ============================================================
-- Índices de Performance para Módulo de Promociones (VERSIÓN SEGURA)
-- ============================================================
-- Fecha: 2026-02-11
-- Propósito: Optimizar queries frecuentes en promociones
-- Nota: Esta versión crea la columna deleted_at PRIMERO
-- ============================================================

-- PASO 1: Agregar columna para soft delete (si no existe)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE promotions ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Columna deleted_at agregada a promotions';
  ELSE
    RAISE NOTICE 'Columna deleted_at ya existe en promotions';
  END IF;
END
$$;


-- PASO 2: Índices para tabla promotions
-- ============================================================

-- Índice compuesto para queries filtradas por organización y estado
CREATE INDEX IF NOT EXISTS idx_promotions_org_active 
ON promotions(organization_id, is_active);

-- Índice para búsquedas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_promotions_dates 
ON promotions(start_date, end_date);

-- Índice compuesto para queries de promociones activas por fecha
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates 
ON promotions(organization_id, is_active, start_date, end_date);

-- Índice para soft delete (ahora la columna existe)
CREATE INDEX IF NOT EXISTS idx_promotions_deleted 
ON promotions(deleted_at) 
WHERE deleted_at IS NULL;


-- PASO 3: Índices para tabla promotions_products
-- ============================================================

-- Índice compuesto para queries por promoción y organización
CREATE INDEX IF NOT EXISTS idx_promotions_products_promo_org 
ON promotions_products(promotion_id, organization_id);

-- Índice compuesto para queries por producto y organización
CREATE INDEX IF NOT EXISTS idx_promotions_products_product_org 
ON promotions_products(product_id, organization_id);

-- Índice para queries solo por organización
CREATE INDEX IF NOT EXISTS idx_promotions_products_org 
ON promotions_products(organization_id);

-- Índice para prevenir duplicados (unique constraint)
-- Nota: Esto puede fallar si ya existen duplicados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_promotions_products_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_promotions_products_unique 
    ON promotions_products(promotion_id, product_id, organization_id);
    RAISE NOTICE 'Índice único creado en promotions_products';
  ELSE
    RAISE NOTICE 'Índice único ya existe en promotions_products';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'No se pudo crear índice único - existen duplicados. Ejecuta: SELECT promotion_id, product_id, organization_id, COUNT(*) FROM promotions_products GROUP BY promotion_id, product_id, organization_id HAVING COUNT(*) > 1;';
END
$$;


-- PASO 4: Índices para tabla promotions_carousel
-- ============================================================

-- Índice compuesto para queries del carrusel por organización y posición
CREATE INDEX IF NOT EXISTS idx_promotions_carousel_org_position 
ON promotions_carousel(organization_id, position);

-- Índice para queries por promoción
CREATE INDEX IF NOT EXISTS idx_promotions_carousel_promotion 
ON promotions_carousel(promotion_id);


-- PASO 5: Índices para tabla carousel_audit_log (si existe)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'carousel_audit_log'
  ) THEN
    -- Índice para queries por usuario
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_user 
    ON carousel_audit_log(user_id, created_at DESC);

    -- Índice para queries por fecha
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_created 
    ON carousel_audit_log(created_at DESC);

    -- Índice para queries por acción
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_action 
    ON carousel_audit_log(action, created_at DESC);
    
    RAISE NOTICE 'Índices creados en carousel_audit_log';
  ELSE
    RAISE NOTICE 'Tabla carousel_audit_log no existe - índices omitidos';
  END IF;
END
$$;


-- PASO 6: Función y Trigger para limitar items en carrusel
-- ============================================================

-- Crear función para validar límite
CREATE OR REPLACE FUNCTION check_carousel_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM promotions_carousel WHERE organization_id = NEW.organization_id) >= 10 THEN
    RAISE EXCEPTION 'Máximo 10 items permitidos en el carrusel por organización';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_carousel_limit'
  ) THEN
    CREATE TRIGGER enforce_carousel_limit
    BEFORE INSERT ON promotions_carousel
    FOR EACH ROW EXECUTE FUNCTION check_carousel_limit();
    RAISE NOTICE 'Trigger enforce_carousel_limit creado';
  ELSE
    RAISE NOTICE 'Trigger enforce_carousel_limit ya existe';
  END IF;
END
$$;


-- PASO 7: Estadísticas y análisis
-- ============================================================

-- Actualizar estadísticas de las tablas para el optimizador
ANALYZE promotions;
ANALYZE promotions_products;
ANALYZE promotions_carousel;

-- Analizar carousel_audit_log si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'carousel_audit_log'
  ) THEN
    EXECUTE 'ANALYZE carousel_audit_log';
    RAISE NOTICE 'Estadísticas actualizadas para carousel_audit_log';
  END IF;
END
$$;


-- PASO 8: Verificación de índices creados
-- ============================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
  AND schemaname = 'public'
ORDER BY tablename, indexname;


-- PASO 9: Reporte de tamaño de índices
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================
-- Fin del script
-- ============================================================

-- Resumen de cambios:
-- ✅ Columna deleted_at agregada a promotions
-- ✅ 4 índices en promotions
-- ✅ 4 índices en promotions_products (incluyendo unique)
-- ✅ 2 índices en promotions_carousel
-- ✅ 3 índices en carousel_audit_log (si existe)
-- ✅ Trigger para limitar carrusel a 10 items
-- ✅ Estadísticas actualizadas
