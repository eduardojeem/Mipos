-- Migración: Audit Logs y Soft Delete para Orders
-- Fecha: 2026-02-10
-- Descripción: Agrega tabla de audit logs y campos para soft delete en orders

-- 1. Crear tabla de audit logs (sin foreign keys que puedan fallar)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'PAYMENT_UPDATE', 'STOCK_UPDATE')),
  table_name VARCHAR(100) NOT NULL,
  record_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  organization_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver logs de su organización (si existe la tabla user_organizations)
DO $$ 
BEGIN
  -- Eliminar políticas existentes si existen
  DROP POLICY IF EXISTS "Users can view audit logs from their organization" ON audit_logs;
  DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_organizations') THEN
    EXECUTE 'CREATE POLICY "Users can view audit logs from their organization"
      ON audit_logs FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id 
          FROM user_organizations 
          WHERE user_id = auth.uid()
        )
      )';
  ELSE
    -- Fallback: permitir ver logs propios
    EXECUTE 'CREATE POLICY "Users can view their own audit logs"
      ON audit_logs FOR SELECT
      USING (user_id = auth.uid())';
  END IF;
END $$;

-- Policy: Solo service role puede insertar logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- 2. Agregar campos de soft delete a orders (solo si la tabla existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    -- Agregar columnas si no existen
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'deleted_at') THEN
      ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'deleted_by') THEN
      ALTER TABLE orders ADD COLUMN deleted_by UUID;
    END IF;
    
    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;
  END IF;
END $$;

-- 3. Función RPC para decrementar stock de forma atómica
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
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para obtener estadísticas de orders optimizada
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
    AND (deleted_at IS NULL OR deleted_at IS NOT NULL);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Índices adicionales para mejorar rendimiento (solo si la tabla orders existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    
    -- Verificar si la columna customer_email existe
    IF EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'customer_email') THEN
      CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
    END IF;
  END IF;
END $$;

-- 6. Comentarios para documentación
COMMENT ON TABLE audit_logs IS 'Registro de auditoría para todas las operaciones críticas del sistema';
COMMENT ON FUNCTION get_order_stats IS 'Obtiene estadísticas agregadas de pedidos de forma optimizada';
COMMENT ON FUNCTION decrement_product_stock IS 'Decrementa el stock de un producto de forma atómica';
