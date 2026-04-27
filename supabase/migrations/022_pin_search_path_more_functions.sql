DO $$
DECLARE
  fn_names text[] := ARRAY[
    'add_org_column',
    'is_admin',
    'has_permission',
    'belongs_to_org',
    'set_default_organization_branding',
    'get_today_sales_summary'
  ];
  fname text;
  rec record;
BEGIN
  FOREACH fname IN ARRAY fn_names LOOP
    FOR rec IN
      SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fname
    LOOP
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = '''';', rec.nspname, rec.proname, rec.args);
    END LOOP;
  END LOOP;
END $$;
