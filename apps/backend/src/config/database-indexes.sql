-- Índices para tablas que SÍ existen en la base de datos
-- Basado en verificación Prisma/Supabase

-- Índices básicos para productos
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_updated_category ON products(updated_at DESC, category_id);
CREATE INDEX IF NOT EXISTS idx_products_price_range ON products(sale_price) WHERE sale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity) WHERE stock_quantity IS NOT NULL;

-- Índices para búsquedas de texto con trigramas
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING gin (description gin_trgm_ops);

-- Índice para optimizar paginación con updated_at
CREATE INDEX IF NOT EXISTS idx_products_updated_at_id ON products(updated_at DESC, id);

-- Índices para la tabla sales (EXISTE) - Usando 'date' ya que 'created_at' puede no existir
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

-- Índice compuesto para reportes de ventas (EXISTE - sales)
CREATE INDEX IF NOT EXISTS idx_sales_date_customer_id ON sales(date, customer_id);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);

-- Tablas adicionales

-- Índices para la tabla sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_daily_overall AS
SELECT
  date_trunc('day', s.date) AS day,
  COUNT(*)::int AS orders,
  COALESCE(SUM(s.total), 0)::float AS revenue,
  COALESCE(SUM(si.quantity * p.cost_price), 0)::float AS cost
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
LEFT JOIN products p ON p.id = si.product_id
GROUP BY day
ORDER BY day ASC;

CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_overall_day ON mv_sales_daily_overall(day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_daily_category AS
SELECT
  date_trunc('day', s.date) AS day,
  c.name AS category_name,
  COALESCE(SUM(si.quantity * si.unit_price), 0)::float AS revenue,
  COALESCE(SUM(si.quantity * p.cost_price), 0)::float AS cost
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
JOIN products p ON p.id = si.product_id
JOIN categories c ON c.id = p.category_id
GROUP BY day, c.name
ORDER BY day ASC, revenue DESC;

CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_category_day ON mv_sales_daily_category(day);
CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_category_cat ON mv_sales_daily_category(category_name);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_daily_product AS
SELECT
  date_trunc('day', s.date) AS day,
  p.id AS product_id,
  p.name AS product_name,
  COALESCE(SUM(si.quantity), 0)::int AS quantity,
  COALESCE(SUM(si.quantity * si.unit_price), 0)::float AS revenue,
  COALESCE(SUM(si.quantity * p.cost_price), 0)::float AS cost
FROM sales s
JOIN sale_items si ON si.sale_id = s.id
JOIN products p ON p.id = si.product_id
GROUP BY day, p.id, p.name
ORDER BY day ASC, revenue DESC;

CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_product_day ON mv_sales_daily_product(day);
CREATE INDEX IF NOT EXISTS idx_mv_sales_daily_product_pid ON mv_sales_daily_product(product_id);

-- Índices para la tabla suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

-- Índices para la tabla audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_created_at ON audit_logs(user_id, action, created_at);

-- Índices para la tabla customer_credits
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer_id ON customer_credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON customer_credits(status);
CREATE INDEX IF NOT EXISTS idx_customer_credits_created_at ON customer_credits(created_at);

-- Índices de texto completo opcionales
-- CREATE INDEX IF NOT EXISTS idx_products_name_tsv ON products USING gin(to_tsvector('spanish', name));
-- CREATE INDEX IF NOT EXISTS idx_customers_name_tsv ON customers USING gin(to_tsvector('spanish', name));

-- Índices para optimizar ordenamiento y paginación
CREATE INDEX IF NOT EXISTS idx_products_name_id ON products(name, id);
CREATE INDEX IF NOT EXISTS idx_sales_date_id ON sales(date DESC, id);
CREATE INDEX IF NOT EXISTS idx_customers_name_id ON customers(name, id);

-- Estadísticas de la base de datos (para PostgreSQL)
-- ANALYZE products;
-- ANALYZE sales;
-- ANALYZE customers;
-- ANALYZE categories;
-- ANALYZE users;
-- ANALYZE inventory_movements;

-- Comentarios sobre el uso de índices:
-- 1. Los índices mejoran la velocidad de SELECT pero ralentizan INSERT/UPDATE/DELETE
-- 2. Monitorear el uso de índices regularmente
-- 3. Eliminar índices no utilizados
-- 4. Considerar índices parciales para datos filtrados frecuentemente
-- 5. Los índices compuestos deben ordenarse por selectividad