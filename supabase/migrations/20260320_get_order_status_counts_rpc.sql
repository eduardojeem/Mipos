-- RPC: get_order_status_counts
-- Devuelve el conteo de pedidos por estado para una organización.
-- Reemplaza la descarga completa de filas que se hacía en el stats endpoint,
-- ejecutando el GROUP BY directamente en Postgres.

CREATE OR REPLACE FUNCTION get_order_status_counts(org_id uuid)
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.status::text,
    COUNT(*)::bigint AS count
  FROM public.sales s
  WHERE
    s.organization_id = org_id
    AND s.deleted_at IS NULL
  GROUP BY s.status;
$$;

-- Revocar acceso público y permitir solo a los roles de servicio
REVOKE ALL ON FUNCTION get_order_status_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_order_status_counts(uuid) TO service_role;
