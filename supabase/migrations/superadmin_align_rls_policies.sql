-- Align Superadmin-managed tables to use is_super_admin() and explicit grants

BEGIN;

-- system_settings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_settings'
  ) THEN
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "SuperAdmin can manage system settings" ON public.system_settings;
    CREATE POLICY "SuperAdmin can manage system settings"
      ON public.system_settings
      FOR ALL
      TO authenticated
      USING (is_super_admin())
      WITH CHECK (is_super_admin());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
    GRANT ALL PRIVILEGES ON public.system_settings TO service_role;
  END IF;
END $$;

-- email_templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_templates'
  ) THEN
    ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "SuperAdmin can manage email templates" ON public.email_templates;
    CREATE POLICY "SuperAdmin can manage email templates"
      ON public.email_templates
      FOR ALL
      TO authenticated
      USING (is_super_admin())
      WITH CHECK (is_super_admin());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
    GRANT ALL PRIVILEGES ON public.email_templates TO service_role;
  END IF;
END $$;

COMMIT;

