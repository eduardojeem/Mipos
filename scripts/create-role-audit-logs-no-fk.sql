-- Create role_audit_logs table without FK constraints to allow creation
CREATE TABLE IF NOT EXISTS public.role_audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_user_id ON public.role_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_action ON public.role_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_role_audit_logs_created_at ON public.role_audit_logs(created_at);

-- Enable RLS
ALTER TABLE public.role_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: allow service_role full access
DROP POLICY IF EXISTS "service_role_all_role_audit_logs" ON public.role_audit_logs;
CREATE POLICY "service_role_all_role_audit_logs" ON public.role_audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policies: allow authenticated to read
DROP POLICY IF EXISTS "authenticated_read_role_audit_logs" ON public.role_audit_logs;
CREATE POLICY "authenticated_read_role_audit_logs" ON public.role_audit_logs
  FOR SELECT TO authenticated USING (true);

-- Grants
GRANT ALL ON TABLE public.role_audit_logs TO service_role;
GRANT SELECT ON TABLE public.role_audit_logs TO authenticated;