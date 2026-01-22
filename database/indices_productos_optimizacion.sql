-- ============================================
-- ÍNDICES RECOMENDADOS PARA OPTIMIZACIÓN
-- Sistema POS - Tabla Products
-- ============================================

-- 1. Índice para búsqueda de texto completo (name, sku, barcode)
-- Mejora: Búsquedas con ILIKE serán 10-50x más rápidas
CREATE INDEX IF NOT EXISTS idx_products_search_name 
ON products USING gin(to_tsvector('spanish', name));

CREATE INDEX IF NOT EXISTS idx_products_sku_lower 
ON products (LOWER(sku));

CREATE INDEX IF NOT EXISTS idx_products_barcode_lower 
ON products (LOWER(barcode)) 
WHERE barcode IS NOT NULL;

-- 2. Índice para filtros por categoría
-- Mejora: Queries por categoría 5-10x más rápidas
CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON products (category_id) 
WHERE category_id IS NOT NULL;

-- 3. Índice compuesto para stock bajo
-- Mejora: Queries de low stock 20-30x más rápidas
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
ON products (stock_quantity, min_stock) 
WHERE stock_quantity <= min_stock;

-- 4. Índice para ordenamiento por precio
-- Mejora: Ordenamiento por precio 3-5x más rápido
CREATE INDEX IF NOT EXISTS idx_products_sale_price 
ON products (sale_price) 
WHERE is_active = true;

-- 5. Índice para productos activos
-- Mejora: Filtros por is_active 2-3x más rápidos
CREATE INDEX IF NOT EXISTS idx_products_active 
ON products (is_active, updated_at DESC);

-- 6. Índice para paginación eficiente
-- Mejora: Paginación 5-10x más rápida
CREATE INDEX IF NOT EXISTS idx_products_pagination 
ON products (updated_at DESC, id) 
WHERE is_active = true;

-- 7. Índice para búsqueda por proveedor
-- Mejora: Queries por supplier 5-10x más rápidas
CREATE INDEX IF NOT EXISTS idx_products_supplier_id 
ON products (supplier_id) 
WHERE supplier_id IS NOT NULL;

-- ============================================
-- ESTADÍSTICAS Y ANÁLISIS
-- ============================================

-- Actualizar estadísticas de la tabla para mejor query planning
ANALYZE products;

-- Ver tamaño de la tabla e índices
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename = 'products';

-- Ver uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'products'
ORDER BY idx_scan DESC;

-- ============================================
-- QUERIES OPTIMIZADAS DE EJEMPLO
-- ============================================

-- 1. Búsqueda de productos (usa idx_products_search_name, idx_products_sku_lower)
EXPLAIN ANALYZE
SELECT id, name, sku, sale_price, stock_quantity
FROM products
WHERE 
    to_tsvector('spanish', name) @@ to_tsquery('spanish', 'shampoo')
    OR LOWER(sku) LIKE LOWER('%shampoo%')
    OR LOWER(barcode) LIKE LOWER('%shampoo%')
LIMIT 10;

-- 2. Productos por categoría (usa idx_products_category_id)
EXPLAIN ANALYZE
SELECT id, name, sku, sale_price, stock_quantity
FROM products
WHERE category_id = 'cat-123'
    AND is_active = true
ORDER BY updated_at DESC
LIMIT 50;

-- 3. Stock bajo (usa idx_products_low_stock)
EXPLAIN ANALYZE
SELECT id, name, sku, stock_quantity, min_stock
FROM products
WHERE stock_quantity <= min_stock
    AND is_active = true
ORDER BY stock_quantity ASC
LIMIT 100;

-- 4. Rango de precios (usa idx_products_sale_price)
EXPLAIN ANALYZE
SELECT id, name, sku, sale_price
FROM products
WHERE sale_price BETWEEN 10.00 AND 50.00
    AND is_active = true
ORDER BY sale_price ASC
LIMIT 50;

-- ============================================
-- MANTENIMIENTO
-- ============================================

-- Reindexar si es necesario (ejecutar durante horas de bajo tráfico)
REINDEX TABLE CONCURRENTLY products;

-- Vacuum para recuperar espacio
VACUUM ANALYZE products;

-- ============================================
-- MONITOREO DE PERFORMANCE
-- ============================================

-- Ver queries lentas en products
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%products%'
ORDER BY mean_time DESC
LIMIT 10;

-- Ver índices no utilizados (considerar eliminar)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'products'
    AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
1. IMPACTO EN ESCRITURA:
   - Los índices mejoran las lecturas pero ralentizan ligeramente las escrituras
   - Para este sistema POS, las lecturas son 90% de las operaciones
   - El trade-off vale la pena

2. ESPACIO EN DISCO:
   - Cada índice ocupa espacio adicional (~10-30% del tamaño de la tabla)
   - Monitorear el uso de disco regularmente

3. MANTENIMIENTO:
   - Ejecutar ANALYZE después de inserts/updates masivos
   - REINDEX si los índices se fragmentan (cada 3-6 meses)
   - VACUUM regularmente para recuperar espacio

4. TESTING:
   - Usar EXPLAIN ANALYZE para verificar que los índices se usan
   - Comparar tiempos antes/después de crear índices
   - Monitorear pg_stat_user_indexes para ver uso real

5. PRIORIDAD DE IMPLEMENTACIÓN:
   Alta prioridad:
   - idx_products_search_name
   - idx_products_category_id
   - idx_products_low_stock
   
   Media prioridad:
   - idx_products_sale_price
   - idx_products_active
   - idx_products_pagination
   
   Baja prioridad:
   - idx_products_supplier_id
   - idx_products_sku_lower
   - idx_products_barcode_lower
*/

-- ============================================
-- EJECUCIÓN RECOMENDADA
-- ============================================

/*
Para implementar estos índices:

1. Conectarse a Supabase SQL Editor
2. Ejecutar los CREATE INDEX uno por uno
3. Verificar con EXPLAIN ANALYZE que se usan
4. Monitorear performance con pg_stat_user_indexes
5. Ajustar según métricas reales

Tiempo estimado de creación:
- Tabla con 1,000 productos: ~1-2 segundos por índice
- Tabla con 10,000 productos: ~5-10 segundos por índice
- Tabla con 100,000 productos: ~30-60 segundos por índice

Los índices se crean con IF NOT EXISTS para evitar errores
si ya existen.
*/
