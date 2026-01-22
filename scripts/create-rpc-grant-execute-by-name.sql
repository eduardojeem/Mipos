-- Helper RPC: grant EXECUTE on all signatures of a function name to a role
CREATE OR REPLACE FUNCTION public.grant_execute_on_function(
  function_name TEXT,
  role_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name,
           p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = function_name
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %I',
                   rec.schema_name, rec.name, rec.args, role_name);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_execute_on_function(TEXT, TEXT) TO authenticated, service_role;