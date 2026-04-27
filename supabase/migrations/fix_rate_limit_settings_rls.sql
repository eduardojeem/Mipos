ALTER TABLE IF EXISTS public.rate_limit_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limit_settings FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_settings'
      AND policyname = 'Sistema puede gestionar rate limits'
  ) THEN
    EXECUTE 'DROP POLICY "Sistema puede gestionar rate limits" ON public.rate_limit_settings';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_settings'
      AND policyname = 'SuperAdmin puede ver rate_limit_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "SuperAdmin puede ver rate_limit_settings" '
      'ON public.rate_limit_settings '
      'FOR SELECT '
      'TO authenticated '
      'USING ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.users '
      '    WHERE users.id = auth.uid() '
      '      AND users.role = ''SUPER_ADMIN'' '
      '  ) '
      ')';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_settings'
      AND policyname = 'SuperAdmin puede insertar rate_limit_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "SuperAdmin puede insertar rate_limit_settings" '
      'ON public.rate_limit_settings '
      'FOR INSERT '
      'TO authenticated '
      'WITH CHECK ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.users '
      '    WHERE users.id = auth.uid() '
      '      AND users.role = ''SUPER_ADMIN'' '
      '  ) '
      ')';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_settings'
      AND policyname = 'SuperAdmin puede actualizar rate_limit_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "SuperAdmin puede actualizar rate_limit_settings" '
      'ON public.rate_limit_settings '
      'FOR UPDATE '
      'TO authenticated '
      'USING ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.users '
      '    WHERE users.id = auth.uid() '
      '      AND users.role = ''SUPER_ADMIN'' '
      '  ) '
      ') '
      'WITH CHECK ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.users '
      '    WHERE users.id = auth.uid() '
      '      AND users.role = ''SUPER_ADMIN'' '
      '  ) '
      ')';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rate_limit_settings'
      AND policyname = 'SuperAdmin puede borrar rate_limit_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "SuperAdmin puede borrar rate_limit_settings" '
      'ON public.rate_limit_settings '
      'FOR DELETE '
      'TO authenticated '
      'USING ( '
      '  EXISTS ( '
      '    SELECT 1 FROM public.users '
      '    WHERE users.id = auth.uid() '
      '      AND users.role = ''SUPER_ADMIN'' '
      '  ) '
      ')';
  END IF;
END$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_settings TO service_role;
