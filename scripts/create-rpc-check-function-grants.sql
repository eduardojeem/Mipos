-- RPC para verificar GRANTS de una función en public
CREATE OR REPLACE FUNCTION public.check_function_grants(
  function_name TEXT
)
RETURNS TABLE (
  grantee TEXT,
  privilege_type TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE specific_schema = 'public'
    AND routine_name = function_name;
$$;

GRANT EXECUTE ON FUNCTION public.check_function_grants(TEXT) TO authenticated, service_role;