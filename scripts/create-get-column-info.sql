-- Función para obtener información de una columna
DROP FUNCTION IF EXISTS public.get_column_info(text, text, text);

CREATE OR REPLACE FUNCTION public.get_column_info(p_schema_name text, p_table_name text, p_column_name text)
RETURNS TABLE(column_name text, data_type text, udt_name text, is_nullable text, column_default text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text, c.udt_name::text, c.is_nullable::text, c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema_name 
    AND c.table_name = p_table_name 
    AND c.column_name = p_column_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_column_info(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_column_info(text, text, text) TO service_role;