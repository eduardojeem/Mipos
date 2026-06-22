-- =============================================================================
-- MIGRATION: 20260619_create_email_logs
-- Tabla liviana para registrar envíos de email (Resend).
-- Solo para trazabilidad y debug — no es fuente de verdad de Resend.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email    TEXT        NOT NULL,
    subject     TEXT        NOT NULL,
    template    TEXT,                         -- 'invitation', 'welcome', etc.
    status      TEXT        NOT NULL DEFAULT 'sent',  -- 'sent', 'failed'
    error       TEXT,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata    JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at
    ON public.email_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status
    ON public.email_logs (status);

-- RLS: solo super admins pueden leer/escribir
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access email_logs" ON public.email_logs;
CREATE POLICY "Super admin full access email_logs"
    ON public.email_logs
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Service role puede escribir (los API routes usan admin client)
DROP POLICY IF EXISTS "Service role write email_logs" ON public.email_logs;
CREATE POLICY "Service role write email_logs"
    ON public.email_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

COMMIT;
