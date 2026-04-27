-- Extend inventory report RPC with stock list limit and low-stock filter

DROP FUNCTION IF EXISTS public.get_inventory_report(uuid, text, text);

CREATE OR REPLACE FUNCTION public.get_inventory_report(
  p_org_id uuid,
  p_category_id text DEFAULT NULL,
  p_product_id text DEFAULT NULL,
  p_stock_limit integer DEFAULT 50,
  p_only_low_stock boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_products bigint;
  v_low_stock bigint;
  v_out_of_stock bigint;
  v_total_value numeric;
  v_stock_levels jsonb;
  v_category_breakdown jsonb;
  v_limit int;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required' USING ERRCODE = '22023';
  END IF;

  IF NOT (p_org_id = ANY(get_user_org_ids())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_limit := LEAST(200, GREATEST(1, COALESCE(p_stock_limit, 50)));

  WITH base AS (
    SELECT
      p.id,
      p.name,
      p.stock_quantity,
      p.min_stock,
      p.sale_price,
      p.category_id
    FROM public.products p
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_product_id IS NULL OR p.id = p_product_id)
  )
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (
      WHERE COALESCE(stock_quantity, 0) > 0
        AND COALESCE(stock_quantity, 0) <= COALESCE(min_stock, 10)
    )::bigint,
    COUNT(*) FILTER (WHERE COALESCE(stock_quantity, 0) = 0)::bigint,
    COALESCE(SUM(COALESCE(sale_price, 0) * COALESCE(stock_quantity, 0)), 0)
  INTO v_total_products, v_low_stock, v_out_of_stock, v_total_value
  FROM base;

  WITH base AS (
    SELECT
      p.name,
      COALESCE(p.stock_quantity, 0) AS stock,
      COALESCE(p.min_stock, 10) AS min_stock
    FROM public.products p
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_product_id IS NULL OR p.id = p_product_id)
  ), filtered AS (
    SELECT
      name,
      stock,
      min_stock
    FROM base
    WHERE (NOT COALESCE(p_only_low_stock, false))
       OR (stock = 0 OR stock <= min_stock)
  ), ranked AS (
    SELECT
      name,
      stock,
      CASE
        WHEN stock = 0 THEN 'low'
        WHEN stock <= min_stock THEN 'low'
        WHEN stock > min_stock * 3 THEN 'high'
        ELSE 'normal'
      END AS status
    FROM filtered
    ORDER BY stock ASC, name ASC
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'stock', stock, 'status', status)), '[]'::jsonb)
  INTO v_stock_levels
  FROM ranked;

  WITH base AS (
    SELECT
      p.category_id,
      COALESCE(p.sale_price, 0) AS price,
      COALESCE(p.stock_quantity, 0) AS stock
    FROM public.products p
    WHERE p.organization_id = p_org_id
      AND p.deleted_at IS NULL
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_product_id IS NULL OR p.id = p_product_id)
  ), agg AS (
    SELECT
      COALESCE(c.name, 'Sin categoría') AS category,
      COUNT(*)::bigint AS count,
      SUM(price * stock) AS value
    FROM base b
    LEFT JOIN public.categories c
      ON c.id = b.category_id
     AND c.organization_id = p_org_id
    GROUP BY 1
    ORDER BY value DESC NULLS LAST, count DESC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category,
        'count', count,
        'value', COALESCE(value, 0)
      )
    ),
    '[]'::jsonb
  )
  INTO v_category_breakdown
  FROM agg;

  RETURN jsonb_build_object(
    'totalProducts', COALESCE(v_total_products, 0),
    'lowStockItems', COALESCE(v_low_stock, 0),
    'outOfStockItems', COALESCE(v_out_of_stock, 0),
    'totalValue', COALESCE(v_total_value, 0),
    'stockLevels', COALESCE(v_stock_levels, '[]'::jsonb),
    'categoryBreakdown', COALESCE(v_category_breakdown, '[]'::jsonb),
    'lastUpdated', to_jsonb(now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_report(uuid, text, text, integer, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inventory_report(uuid, text, text, integer, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';

