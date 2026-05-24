CREATE TABLE IF NOT EXISTS public.catalog_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_created_at
  ON public.catalog_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_event_type
  ON public.catalog_audit_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_logs_resource
  ON public.catalog_audit_logs (resource_type, resource_id);

ALTER TABLE public.catalog_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'catalog_audit_logs'
      AND policyname = 'Service role can manage catalog audit logs'
  ) THEN
    CREATE POLICY "Service role can manage catalog audit logs"
      ON public.catalog_audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
