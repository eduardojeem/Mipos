-- =====================================================
-- Script: Agregar tabla de fallos de sincronización
-- Propósito: Registrar fallos de sincronización externa para retry posterior
-- Fecha: 2026-02-11
-- =====================================================

-- Crear tabla sync_failures si no existe
CREATE TABLE IF NOT EXISTS sync_failures (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    error TEXT NOT NULL,
    payload TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_sync_failures_entity ON sync_failures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_failures_retry ON sync_failures(retry_count, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_failures_created_at ON sync_failures(created_at DESC);

-- Comentarios
COMMENT ON TABLE sync_failures IS 'Registro de fallos de sincronización externa para retry posterior';
COMMENT ON COLUMN sync_failures.entity_type IS 'Tipo de entidad (RETURN, SALE, etc.)';
COMMENT ON COLUMN sync_failures.entity_id IS 'ID de la entidad que falló al sincronizar';
COMMENT ON COLUMN sync_failures.action IS 'Acción que se intentó realizar (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN sync_failures.error IS 'Mensaje de error';
COMMENT ON COLUMN sync_failures.payload IS 'Payload JSON que se intentó enviar';
COMMENT ON COLUMN sync_failures.retry_count IS 'Número de reintentos realizados';
COMMENT ON COLUMN sync_failures.last_retry_at IS 'Fecha del último reintento';

-- Verificar que la tabla se creó correctamente
SELECT 
    'sync_failures table created successfully' as status,
    COUNT(*) as initial_count
FROM sync_failures;
