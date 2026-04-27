DO $$
DECLARE
  is_table BOOLEAN;
  is_view BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'companies' AND c.relkind = 'r'
  ) INTO is_table;

  SELECT EXISTS (
    SELECT 1 FROM pg_views v WHERE v.schemaname = 'public' AND v.viewname = 'companies'
  ) INTO is_view;

  IF is_view THEN
    EXECUTE 'ALTER VIEW public.companies RENAME TO v_companies';
  END IF;

  IF is_table THEN
    -- Create a non-conflicting view aliasing organizations
    EXECUTE 'CREATE OR REPLACE VIEW public.v_companies AS '
      || 'SELECT o.id, o.name, o.slug, '
      || 'o.subscription_plan AS plan_code, o.subscription_status, o.settings, '
      || 'o.created_at, o.updated_at FROM public.organizations o';
    -- Ensure read grants
    EXECUTE 'GRANT SELECT ON public.v_companies TO authenticated, service_role';
  END IF;
END $$;
