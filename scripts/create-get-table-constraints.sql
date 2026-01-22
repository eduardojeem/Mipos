-- Crear función para obtener constraints de una tabla
DROP FUNCTION IF EXISTS public.get_table_constraints(text, text);

CREATE OR REPLACE FUNCTION public.get_table_constraints(p_schema_name text, p_table_name text)
RETURNS TABLE(constraint_name text, constraint_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT tc.constraint_name::text, tc.constraint_type::text
  FROM information_schema.table_constraints tc
  WHERE tc.table_schema = p_schema_name AND tc.table_name = p_table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_table_constraints(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_constraints(text, text) TO service_role;