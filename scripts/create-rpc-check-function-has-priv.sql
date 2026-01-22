-- RPC helper to check EXECUTE privilege using a function signature string
CREATE OR REPLACE FUNCTION public.check_function_has_privilege(
  function_signature TEXT,
  role_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  fn_oid regprocedure;
BEGIN
  -- Try to resolve the signature to a regprocedure OID
  BEGIN
    fn_oid := function_signature::regprocedure;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;

  -- Check privilege using OID-based variant
  RETURN has_function_privilege(role_name, fn_oid, 'EXECUTE');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_function_has_privilege(TEXT, TEXT) TO authenticated, service_role;