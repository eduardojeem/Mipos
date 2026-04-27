-- Migración: Funciones RPC para Orders
-- Ejecutar DESPUÉS de crear audit_logs y soft delete

-- 1. Función para decrementar stock de forma atómica
CREATE OR REPLACE FUNCTION decrement_product_stock(
  product_id UUID,
  quantity_to_subtract INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Verificar si la tabla products existe
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    UPDATE products
    SET stock_quantity = GREATEST(stock_quantity - quantity_to_subtract, 0)
    WHERE id = product_id;
  ELSE
    RAISE NOTICE 'La tabla products no existe';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para obtener estadísticas de orders optimizada
CREATE OR REPLACE FUNCTION get_order_stats(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  today_start := DATE_TRUNC('day', NOW());
  
  -- Verificar si la tabla orders existe
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    RETURN json_build_object(
      'total', 0,
      'pending', 0,
      'confirmed', 0,
      'preparing', 0,
      'shipped', 0,
      'delivered', 0,
      'cancelled', 0,
      'todayOrders', 0,
      'todayRevenue', 0,
      'avgOrderValue', 0
    );
  END IF;
  
  -- Calcular estadísticas
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'PENDING'),
    'confirmed', COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
    'preparing', COUNT(*) FILTER (WHERE status = 'PREPARING'),
    'shipped', COUNT(*) FILTER (WHERE status = 'SHIPPED'),
    'delivered', COUNT(*) FILTER (WHERE status = 'DELIVERED'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'CANCELLED'),
    'todayOrders', COUNT(*) FILTER (WHERE created_at >= today_start AND status != 'CANCELLED'),
    'todayRevenue', COALESCE(SUM(total) FILTER (WHERE created_at >= today_start AND status != 'CANCELLED'), 0),
    'avgOrderValue', COALESCE(AVG(total) FILTER (WHERE status != 'CANCELLED'), 0)
  ) INTO result
  FROM orders
  WHERE organization_id = org_id
    AND (deleted_at IS NULL);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentarios
COMMENT ON FUNCTION get_order_stats IS 'Obtiene estadísticas agregadas de pedidos de forma optimizada';
COMMENT ON FUNCTION decrement_product_stock IS 'Decrementa el stock de un producto de forma atómica';

-- 4. Verificar
SELECT 'Funciones RPC creadas correctamente' AS status;
SELECT proname, prosrc FROM pg_proc WHERE proname IN ('get_order_stats', 'decrement_product_stock');
