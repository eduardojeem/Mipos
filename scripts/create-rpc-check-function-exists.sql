-- Utility RPC to check if a function exists in public schema

CREATE OR REPLACE FUNCTION public.check_function_exists(
  function_name TEXT
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = function_name
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_function_exists(TEXT) TO authenticated, service_role;