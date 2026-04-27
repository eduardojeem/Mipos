ALTER TABLE IF EXISTS public.system_settings_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings_audit FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_settings_audit'
      AND policyname = 'Sistema puede insertar en audit log'
  ) THEN
    EXECUTE 'DROP POLICY "Sistema puede insertar en audit log" ON public.system_settings_audit';
  END IF;
END$$;
CREATE POLICY IF NOT EXISTS "SuperAdmin puede insertar en system_settings_audit"
  ON public.system_settings_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'SUPER_ADMIN'
    )
  );
CREATE POLICY IF NOT EXISTS "SuperAdmin puede ver system_settings_audit"
  ON public.system_settings_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'SUPER_ADMIN'
    )
  );
GRANT SELECT, INSERT ON public.system_settings_audit TO authenticated;
GRANT SELECT, INSERT ON public.system_settings_audit TO service_role;
COMMENT ON TABLE public.system_settings_audit IS 'Audit de cambios de system_settings; acceso restringido a SUPER_ADMIN.';
