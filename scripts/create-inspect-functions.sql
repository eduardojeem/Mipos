-- Create an RPC to inspect types of roles-related tables
CREATE OR REPLACE FUNCTION public.inspect_roles_types()
RETURNS TABLE(table_name TEXT, column_name TEXT, data_type TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT c.table_name, c.column_name, c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('roles','permissions','role_permissions','user_roles')
ORDER BY c.table_name, c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION public.inspect_roles_types() TO authenticated;
GRANT EXECUTE ON FUNCTION public.inspect_roles_types() TO service_role;

DO $$ BEGIN PERFORM pg_notify('pgrst', 'reload schema'); END $$;