-- Migración Mínima: Audit Logs
-- Ejecutar este script si los otros fallan
-- Copia y pega en Supabase SQL Editor

-- 1. Eliminar tabla si existe (para empezar limpio)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 2. Crear tabla de audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action VARCHAR(50) NOT NULL,
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

-- 3. Crear índices
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);

-- 4. Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas (sin IF NOT EXISTS)
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- 6. Comentario
COMMENT ON TABLE audit_logs IS 'Registro de auditoría para todas las operaciones críticas del sistema';

-- 7. Verificar
SELECT 'Tabla audit_logs creada correctamente' AS status;
