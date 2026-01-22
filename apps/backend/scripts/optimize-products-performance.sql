-- Script de optimización de rendimiento para productos
-- Este script contiene optimizaciones específicas para la ruta /dashboard/products

-- 1. ANALYZE para actualizar estadísticas del planner
ANALYZE products;
ANALYZE categories;
ANALYZE inventory_movements;

-- 2. Índices compuestos para consultas frecuentes del dashboard
CREATE INDEX IF NOT EXISTS idx_products_dashboard_list ON products(updated_at DESC, category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_dashboard_search ON products(name, category_id, is_active, sale_price);

-- 3. Índice para búsquedas por rango de precios
CREATE INDEX IF NOT EXISTS idx_products_price_range_comp ON products(sale_price, category_id) 
WHERE sale_price IS NOT NULL;

-- 4. Índice para filtrado por stock (optimización temporal hasta implementar lógica completa)
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_quantity, min_stock) 
WHERE stock_quantity IS NOT NULL AND min_stock IS NOT NULL;

-- 5. Vista materializada para estadísticas de productos (opcional, para reportes)
DROP MATERIALIZED VIEW IF EXISTS product_stats_mv;
CREATE MATERIALIZED VIEW product_stats_mv AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.sale_price,
    p.stock_quantity,
    p.min_stock,
    p.category_id,
    p.is_active,
    p.updated_at,
    c.name as category_name,
    COUNT(im.id) as movement_count,
    COALESCE(SUM(CASE WHEN im.movement_type = 'IN' THEN im.quantity ELSE 0 END), 0) as total_in,
    COALESCE(SUM(CASE WHEN im.movement_type = 'OUT' THEN im.quantity ELSE 0 END), 0) as total_out,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'out-of-stock'
        WHEN p.stock_quantity <= p.min_stock THEN 'low-stock'
        ELSE 'in-stock'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory_movements im ON p.id = im.product_id
WHERE p.is_active = true
GROUP BY p.id, c.name;

-- Índice para la vista materializada
CREATE INDEX IF NOT EXISTS idx_product_stats_mv_category ON product_stats_mv(category_id, stock_status);
CREATE INDEX IF NOT EXISTS idx_product_stats_mv_updated ON product_stats_mv(updated_at DESC);

-- 6. Configuración de PostgreSQL para mejorar rendimiento
-- Nota: Estos valores deben ser ajustados según los recursos del servidor

-- Aumentar work_mem para consultas complejas (si el servidor tiene suficiente RAM)
-- SET work_mem = '256MB';

-- Aumentar shared_buffers (requiere reinicio del servidor)
-- SET shared_buffers = '2GB';

-- 7. Actualizar estadísticas después de crear índices
ANALYZE products;
ANALYZE product_stats_mv;

-- 8. Verificar el uso de índices con EXPLAIN
-- Descomentar para ver el plan de ejecución de consultas comunes

-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
-- SELECT * FROM products 
-- WHERE category_id = 'some-category' 
-- AND is_active = true 
-- AND updated_at > '2024-01-01'
-- ORDER BY updated_at DESC
-- LIMIT 20;

-- EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
-- SELECT * FROM products 
-- WHERE name ILIKE '%test%'
-- AND category_id = 'some-category'
-- ORDER BY name ASC
-- LIMIT 10;