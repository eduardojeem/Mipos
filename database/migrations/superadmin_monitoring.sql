-- Migración: Configuración de Superadmin y Funciones RPC para Monitorización
-- Fecha: 2026-02-01
-- Descripción: Crea tabla de configuración y funciones para métricas de Supabase

-- ============================================================================
-- 1. TABLA DE CONFIGURACIÓN DE SUPERADMIN
-- ============================================================================

-- Tabla para almacenar configuración de monitorización
CREATE TABLE IF NOT EXISTS superadmin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_superadmin_settings_key 
  ON superadmin_settings(setting_key);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_superadmin_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_superadmin_settings_updated_at
  BEFORE UPDATE ON superadmin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_superadmin_settings_updated_at();

-- RLS Policies (solo superadmin)
ALTER TABLE superadmin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin full access"
  ON superadmin_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Insertar configuración por defecto
INSERT INTO superadmin_settings (setting_key, setting_value)
VALUES (
  'monitoring_config',
  jsonb_build_object(
    'mode', 'LIGHT',
    'autoRefresh', false,
    'refreshInterval', 300000,
    'customMetrics', '[]'::jsonb
  )
) ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE superadmin_settings IS 'Configuración global del panel de superadmin';
COMMENT ON COLUMN superadmin_settings.setting_key IS 'Clave única de la configuración (ej: monitoring_config)';
COMMENT ON COLUMN superadmin_settings.setting_value IS 'Valor JSON de la configuración';

-- ============================================================================
-- 2. FUNCIONES RPC PARA MÉTRICAS DE MONITORIZACIÓN
-- ============================================================================

-- Función para calcular tamaño de BD por organización
CREATE OR REPLACE FUNCTION get_organization_db_size(org_id uuid)
RETURNS TABLE (
  organization_id uuid,
  total_size_bytes bigint,
  total_size_mb numeric
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables text[] := ARRAY['products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'inventory_movements'];
  table_name text;
  table_size bigint;
  total_size bigint := 0;
BEGIN
  -- Sumar el tamaño de todas las tablas relevantes
  FOREACH table_name IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT COALESCE(pg_total_relation_size(''%I''), 0)', 
        table_name
      ) INTO table_size;
      
      total_size := total_size + table_size;
    EXCEPTION WHEN OTHERS THEN
      -- Si la tabla no existe, continuar
      CONTINUE;
    END;
  END LOOP;
  
  RETURN QUERY SELECT 
    org_id,
    total_size,
    ROUND((total_size::numeric / 1024 / 1024), 2);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener métricas de performance de la BD
CREATE OR REPLACE FUNCTION get_database_performance_metrics()
RETURNS TABLE (
  metric_name text,
  metric_value numeric,
  metric_unit text
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cache_hit_ratio'::text,
    ROUND(
      CASE 
        WHEN (blks_hit + blks_read) > 0 
        THEN (blks_hit::numeric / (blks_hit + blks_read)) * 100
        ELSE 0
      END,
      2
    ),
    'percentage'::text
  FROM pg_stat_database
  WHERE datname = current_database()
  
  UNION ALL
  
  SELECT 
    'active_connections'::text,
    count(*)::numeric,
    'connections'::text
  FROM pg_stat_activity
  WHERE state = 'active'
  
  UNION ALL
  
  SELECT 
    'idle_connections'::text,
    count(*)::numeric,
    'connections'::text
  FROM pg_stat_activity
  WHERE state = 'idle'
  
  UNION ALL
  
  SELECT 
    'transactions_committed'::text,
    xact_commit::numeric,
    'count'::text
  FROM pg_stat_database
  WHERE datname = current_database()
  
  UNION ALL
  
  SELECT 
    'transactions_rolled_back'::text,
    xact_rollback::numeric,
    'count'::text
  FROM pg_stat_database
  WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- Función para obtener tablas más grandes
CREATE OR REPLACE FUNCTION get_largest_tables(limit_count int DEFAULT 20)
RETURNS TABLE (
  table_name text,
  total_size_bytes bigint,
  total_size_pretty text,
  row_count bigint
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    pg_total_relation_size(schemaname || '.' || tablename) AS total_size_bytes,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size_pretty,
    n_live_tup AS row_count
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener índices no utilizados
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
  schema_name text,
  table_name text,
  index_name text,
  index_size_pretty text,
  index_scans bigint
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname::text,
    tablename::text,
    indexrelname::text,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size_pretty,
    idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%pkey%'  -- Excluir primary keys
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener conteo de registros por organización
CREATE OR REPLACE FUNCTION get_organization_record_counts(org_id uuid)
RETURNS TABLE (
  table_name text,
  record_count bigint
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'products'::text, count(*)
  FROM products WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 'customers'::text, count(*)
  FROM customers WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 'suppliers'::text, count(*)
  FROM suppliers WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 'sales'::text, count(*)
  FROM sales WHERE organization_id = org_id
  
  UNION ALL
  
  SELECT 'sale_items'::text, count(*)
  FROM sale_items WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. PERMISOS
-- ============================================================================

-- Otorgar permisos de ejecución solo a usuarios autenticados
GRANT EXECUTE ON FUNCTION get_organization_db_size TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_largest_tables TO authenticated;
GRANT EXECUTE ON FUNCTION get_unused_indexes TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_record_counts TO authenticated;

-- Comentarios de documentación
COMMENT ON FUNCTION get_organization_db_size IS 'Calcula el tamaño total de BD usado por una organización específica';
COMMENT ON FUNCTION get_database_performance_metrics IS 'Obtiene métricas de rendimiento de la base de datos';
COMMENT ON FUNCTION get_largest_tables IS 'Lista las tablas más grandes de la base de datos';
COMMENT ON FUNCTION get_unused_indexes IS 'Encuentra índices que nunca han sido utilizados';
COMMENT ON FUNCTION get_organization_record_counts IS 'Cuenta registros por tabla para una organización';
