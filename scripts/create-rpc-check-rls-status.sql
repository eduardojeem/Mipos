-- Utility RPC to inspect RLS status globally or for a specific table

CREATE OR REPLACE FUNCTION public.check_rls_status(
  table_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  schema_name TEXT,
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT ns.nspname AS schema_name,
         c.relname AS table_name,
         c.relrowsecurity AS rls_enabled,
         COALESCE(
           (SELECT COUNT(*) FROM pg_policies pol
             WHERE pol.schemaname = ns.nspname
               AND pol.tablename = c.relname), 0) AS policy_count
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE c.relkind = 'r'
    AND ns.nspname = 'public'
    AND (
      table_name IS NULL OR c.relname = table_name
    )
  ORDER BY c.relname;
$$;

GRANT EXECUTE ON FUNCTION public.check_rls_status(TEXT) TO authenticated, service_role;