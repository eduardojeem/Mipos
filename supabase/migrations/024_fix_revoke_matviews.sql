DO $$
DECLARE
  vname text;
BEGIN
  FOR vname IN SELECT matviewname FROM pg_matviews WHERE schemaname = 'public' AND matviewname IN (
    'mv_sales_daily_overall', 'mv_sales_daily_category', 'mv_sales_daily_product'
  ) LOOP
    EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon, authenticated;', vname);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role;', vname);
  END LOOP;
END $$;
