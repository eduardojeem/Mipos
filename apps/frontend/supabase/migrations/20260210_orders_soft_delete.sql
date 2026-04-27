-- Migración: Soft Delete para Orders
-- Ejecutar DESPUÉS de crear audit_logs
-- Solo si la tabla orders existe

-- 1. Verificar que orders existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    RAISE NOTICE 'La tabla orders no existe. Saltando migración.';
    RETURN;
  END IF;
  
  -- 2. Agregar columnas de soft delete
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'deleted_at') THEN
    ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Columna deleted_at agregada a orders';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'deleted_by') THEN
    ALTER TABLE orders ADD COLUMN deleted_by UUID;
    RAISE NOTICE 'Columna deleted_by agregada a orders';
  END IF;
END $$;

-- 3. Crear índice para soft delete
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- 4. Crear índices adicionales para rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. Verificar
SELECT 'Soft delete agregado a orders correctamente' AS status;
