-- =====================================================
-- Migration: Add SyncFailure table and metadata to AuditLog
-- Date: 2026-02-11
-- Purpose: Support external sync failure tracking and enhanced audit logging
-- =====================================================

-- 1. Add metadata column to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata TEXT;

-- 2. Create sync_failures table
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

-- 3. Create indexes for sync_failures
CREATE INDEX IF NOT EXISTS idx_sync_failures_entity ON sync_failures(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_failures_retry ON sync_failures(retry_count, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_failures_created_at ON sync_failures(created_at DESC);

-- 4. Add comments for documentation
COMMENT ON TABLE sync_failures IS 'Registro de fallos de sincronización externa para retry posterior';
COMMENT ON COLUMN sync_failures.entity_type IS 'Tipo de entidad (RETURN, SALE, etc.)';
COMMENT ON COLUMN sync_failures.entity_id IS 'ID de la entidad que falló al sincronizar';
COMMENT ON COLUMN sync_failures.action IS 'Acción que se intentó realizar (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN sync_failures.error IS 'Mensaje de error';
COMMENT ON COLUMN sync_failures.payload IS 'Payload JSON que se intentó enviar';
COMMENT ON COLUMN sync_failures.retry_count IS 'Número de reintentos realizados';
COMMENT ON COLUMN sync_failures.last_retry_at IS 'Fecha del último reintento';

COMMENT ON COLUMN audit_logs.metadata IS 'Metadata adicional en formato JSON para auditoría detallada';

-- 5. Verify tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_failures') THEN
        RAISE NOTICE 'sync_failures table created successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        RAISE NOTICE 'metadata column added to audit_logs successfully';
    END IF;
END $$;
