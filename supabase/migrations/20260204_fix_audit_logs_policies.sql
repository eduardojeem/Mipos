-- Fix audit_logs policies
-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.audit_logs;

-- Policy: Super admins can view all audit logs
CREATE POLICY "Super admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Policy: Super admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;
