-- ============================================================
-- Índices de Performance para Módulo de Promociones
-- ============================================================
-- Fecha: 2026-02-11
-- Propósito: Optimizar queries frecuentes en promociones
-- ============================================================

-- Agregar columna para soft delete PRIMERO (si no existe)
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


-- Índices para tabla promotions
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

-- Índice para soft delete (solo si la columna existe)
CREATE INDEX IF NOT EXISTS idx_promotions_deleted 
ON promotions(deleted_at) 
WHERE deleted_at IS NULL;


-- Índices para tabla promotions_products
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_products_unique 
ON promotions_products(promotion_id, product_id, organization_id);


-- Índices para tabla promotions_carousel
-- ============================================================

-- Índice compuesto para queries del carrusel por organización y posición
CREATE INDEX IF NOT EXISTS idx_promotions_carousel_org_position 
ON promotions_carousel(organization_id, position);

-- Índice para queries por promoción
CREATE INDEX IF NOT EXISTS idx_promotions_carousel_promotion 
ON promotions_carousel(promotion_id);


-- Índices para tabla carousel_audit_log (si existe)
-- ============================================================

-- Índice para queries por usuario
CREATE INDEX IF NOT EXISTS idx_carousel_audit_user 
ON carousel_audit_log(user_id, created_at DESC);

-- Índice para queries por fecha
CREATE INDEX IF NOT EXISTS idx_carousel_audit_created 
ON carousel_audit_log(created_at DESC);

-- Índice para queries por acción
CREATE INDEX IF NOT EXISTS idx_carousel_audit_action 
ON carousel_audit_log(action, created_at DESC);


-- Constraints adicionales
-- ============================================================

-- Constraint para limitar items en el carrusel (máximo 10 por organización)
-- Nota: Esto requiere una función trigger
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
  END IF;
END
$$;


-- Estadísticas y análisis
-- ============================================================

-- Actualizar estadísticas de las tablas para el optimizador
ANALYZE promotions;
ANALYZE promotions_products;
ANALYZE promotions_carousel;


-- Verificación de índices creados
-- ============================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY tablename, indexname;


-- ============================================================
-- Fin del script
-- ============================================================
