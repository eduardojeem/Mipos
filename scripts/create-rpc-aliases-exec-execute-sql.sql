-- Compatibility aliases for legacy scripts

-- exec(sql) -> calls exec_sql(sql)
CREATE OR REPLACE FUNCTION public.exec(sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN public.exec_sql(sql);
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec(TEXT) TO authenticated, service_role;

-- execute_sql(query, params) -> thin wrapper to support older scripts.
-- NOTE: params are currently ignored; query is executed via exec_sql.
-- This preserves compatibility with code that passes params but keeps execution simple.
CREATE OR REPLACE FUNCTION public.execute_sql(
  query TEXT,
  params JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN public.exec_sql(query);
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT, JSONB) TO authenticated, service_role;