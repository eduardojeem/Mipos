DO $$
DECLARE
  fn_names text[] := ARRAY[
    'has_active_subscription',
    'get_user_company_id',
    'get_company_limits',
    'migrate_organizations_to_companies',
    'create_company_plan_limits',
    'map_organization_plan',
    'get_order_stats'
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
