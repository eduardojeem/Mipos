-- Migration: product_sku_barcode_unique_per_org
-- 
-- Cambia los constraints UNIQUE globales de sku y barcode en la tabla products
-- por constraints compuestos (organization_id, sku) y (organization_id, barcode).
-- 
-- Motivación: en un sistema multi-tenant dos organizaciones deben poder usar el
-- mismo SKU o barcode de forma independiente. El constraint global impedía esto
-- y provocaba errores 500 al intentar crear productos con SKUs ya usados por
-- otra organización.
--
-- PRECAUCIONES:
-- 1. Si existe algún producto con sku=NULL o barcode=NULL, los constraints
--    compuestos permiten múltiples filas con (org_id, NULL) sin conflicto
--    porque NULL != NULL en SQL. Esto es el comportamiento esperado.
-- 2. Aplicar durante una ventana de mantenimiento si el volumen de datos es alto.

-- Paso 1: Eliminar los índices únicos globales existentes
DROP INDEX IF EXISTS "products_sku_key";
DROP INDEX IF EXISTS "products_barcode_key";

-- Paso 2: Eliminar las constraints UNIQUE antiguas si existen como constraints
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_sku_key";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_barcode_key";

-- Paso 3: Crear constraints únicos compuestos por organización
-- Usa un índice parcial para barcode (que es nullable) para evitar conflictos con NULL
CREATE UNIQUE INDEX IF NOT EXISTS "products_organization_sku_key"
  ON "products" ("organization_id", "sku");

CREATE UNIQUE INDEX IF NOT EXISTS "products_organization_barcode_key"
  ON "products" ("organization_id", "barcode")
  WHERE "barcode" IS NOT NULL;

-- Paso 4: Índices de cobertura para queries frecuentes
CREATE INDEX IF NOT EXISTS "products_organization_id_idx"
  ON "products" ("organization_id");

CREATE INDEX IF NOT EXISTS "products_organization_is_active_idx"
  ON "products" ("organization_id", "is_active");

CREATE INDEX IF NOT EXISTS "products_organization_category_idx"
  ON "products" ("organization_id", "category_id");
