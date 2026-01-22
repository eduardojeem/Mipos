-- Creates an aggregate RPC used by OptimizedDashboard to fetch top products
-- Signature expected by frontend: get_top_products(user_id_param uuid, limit_param int)

CREATE OR REPLACE FUNCTION public.get_top_products(
  user_id_param uuid,
  limit_param int DEFAULT 5
)
RETURNS TABLE (
  id text,
  name text,
  sales_count bigint,
  revenue numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT p.id::text AS id,
         p.name,
         COALESCE(SUM(si.quantity), 0)::bigint AS sales_count,
         COALESCE(SUM((si.quantity::numeric) * (si.unit_price::numeric)), 0)::numeric AS revenue
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  JOIN public.sales s ON s.id = si.sale_id
  WHERE user_id_param IS NULL OR s.user_id = user_id_param
  GROUP BY p.id, p.name
  ORDER BY revenue DESC, sales_count DESC
  LIMIT limit_param;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_products(uuid, int) TO authenticated, service_role;