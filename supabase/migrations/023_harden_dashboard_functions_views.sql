DO $$
DECLARE
  fn_names text[] := ARRAY[
    'get_dashboard_counts',
    'get_orders_dashboard_stats',
    'decrement_product_stock'
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

CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
DECLARE
  cur_schema name;
BEGIN
  SELECT n.nspname INTO cur_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';
  IF cur_schema = 'public' THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END $$;

-- Materialized view permissions handled in 024_fix_revoke_matviews.sql
