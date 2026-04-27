-- Seed de datos reales para reports (organizations, roles, categories, products, customers, sales, sale_items, inventory_movements)
-- No usar timestamps en nombres; este archivo está pensado para entorno de desarrollo

BEGIN;
SET session_replication_role = 'replica';

WITH org AS (
  INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status, settings)
  VALUES ('Demo Shop', 'demo-shop', 'FREE', 'ACTIVE', '{"taxIncludedInPrices": true}'::jsonb)
  RETURNING id
),
usr AS (
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  SELECT gen_random_uuid(), 'admin@demo.co', 'Demo Admin', 'ADMIN', org.id FROM org
  RETURNING id, organization_id
),
admin_role AS (
  INSERT INTO public.roles (name, display_name, description, is_system_role, is_active, organization_id)
  SELECT 'ADMIN', 'Administrador', 'Rol administrador demo', false, true, org.id FROM org
  ON CONFLICT (name) DO NOTHING
  RETURNING id, organization_id
),
manager_role AS (
  INSERT INTO public.roles (name, display_name, description, is_system_role, is_active, organization_id)
  SELECT 'MANAGER', 'Gerente', 'Rol gerente demo', false, true, org.id FROM org
  ON CONFLICT (name) DO NOTHING
  RETURNING id, organization_id
),
cashier_role AS (
  INSERT INTO public.roles (name, display_name, description, is_system_role, is_active, organization_id)
  SELECT 'CASHIER', 'Cajero', 'Rol cajero demo', false, true, org.id FROM org
  ON CONFLICT (name) DO NOTHING
  RETURNING id, organization_id
),
cats AS (
  INSERT INTO public.categories (id, name, description, organization_id)
  SELECT gen_random_uuid()::text, 'Bebidas', 'Bebidas frías y calientes', org.id FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, 'Snacks', 'Snacks y botanas', org.id FROM org
  RETURNING id, name, organization_id
),
prods AS (
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, is_active)
  SELECT gen_random_uuid()::text, 'Producto A', 'SKU-A', (SELECT id FROM cats WHERE name='Bebidas'), 'Bebida energizante', 5.00, 10.00, 50, 10, '{}'::text[], org.id, true FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, 'Producto B', 'SKU-B', (SELECT id FROM cats WHERE name='Bebidas'), 'Café molido', 3.00, 8.00, 20, 10, '{}'::text[], org.id, true FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, 'Producto C', 'SKU-C', (SELECT id FROM cats WHERE name='Snacks'), 'Papas fritas', 1.00, 3.00, 0, 5, '{}'::text[], org.id, true FROM org
  RETURNING id, name, sale_price, cost_price, organization_id
),
cust AS (
  INSERT INTO public.customers (id, name, phone, email, organization_id, is_active)
  SELECT gen_random_uuid()::text, 'Cliente 1', NULL, NULL, org.id, true FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, 'Cliente 2', NULL, NULL, org.id, true FROM org
  RETURNING id, name, organization_id
),
sales AS (
  INSERT INTO public.sales (id, user_id, customer_id, subtotal, discount, discount_type, tax, total, date, payment_method, notes, organization_id, status, order_source)
  SELECT gen_random_uuid()::text, (SELECT id FROM usr), (SELECT id FROM cust ORDER BY name LIMIT 1), 100.00, 0, 'PERCENTAGE'::discount_type, 18.00, 118.00, now() - interval '3 days', 'CASH'::payment_method, 'Venta demo A', org.id, 'COMPLETED', 'POS' FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, (SELECT id FROM usr), (SELECT id FROM cust ORDER BY name DESC LIMIT 1), 80.00, 0, 'PERCENTAGE'::discount_type, 14.40, 94.40, now() - interval '2 days', 'CARD'::payment_method, 'Venta demo B', org.id, 'COMPLETED', 'POS' FROM org
  RETURNING id, subtotal, organization_id
),
items AS (
  INSERT INTO public.sale_items (id, sale_id, product_id, quantity, unit_price)
  SELECT gen_random_uuid()::text, (SELECT id FROM sales LIMIT 1), (SELECT id FROM prods WHERE name='Producto A'), 5, (SELECT sale_price FROM prods WHERE name='Producto A')
  UNION ALL
  SELECT gen_random_uuid()::text, (SELECT id FROM sales LIMIT 1), (SELECT id FROM prods WHERE name='Producto B'), 3, (SELECT sale_price FROM prods WHERE name='Producto B')
  UNION ALL
  SELECT gen_random_uuid()::text, (SELECT id FROM sales ORDER BY subtotal DESC LIMIT 1), (SELECT id FROM prods WHERE name='Producto C'), 10, (SELECT sale_price FROM prods WHERE name='Producto C')
  RETURNING id
),
inv AS (
  INSERT INTO public.inventory_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, organization_id, created_at)
  SELECT gen_random_uuid()::text, (SELECT id FROM prods WHERE name='Producto A'), 'OUT'::movement_type, 5, 'SALE', (SELECT id FROM sales LIMIT 1), 'Salida por venta', org.id, now() - interval '3 days' FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, (SELECT id FROM prods WHERE name='Producto B'), 'OUT'::movement_type, 3, 'SALE', (SELECT id FROM sales LIMIT 1), 'Salida por venta', org.id, now() - interval '3 days' FROM org
  UNION ALL
  SELECT gen_random_uuid()::text, (SELECT id FROM prods WHERE name='Producto C'), 'OUT'::movement_type, 10, 'SALE', (SELECT id FROM sales ORDER BY subtotal DESC LIMIT 1), 'Salida por venta', org.id, now() - interval '2 days' FROM org
  RETURNING id
)
SELECT 1;

SET session_replication_role = 'origin';
COMMIT;
