-- =============================================================================
-- MIGRATION: 20260620_get_products_summary
-- Calcula el resumen de productos (total, sin stock, stock bajo, valor de
-- inventario, agregados recientes, categoría top) en SQL, en una sola llamada,
-- en vez de traer toda la tabla de productos al server y reducir en JS.
-- Scopea por organization_id. SECURITY DEFINER.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_products_summary(
  p_org_id     text,
  p_is_active  boolean DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_total       int := 0;
  v_low         int := 0;
  v_out         int := 0;
  v_value       numeric := 0;
  v_recent      int := 0;
  v_top_cat     text := 'N/A';
BEGIN
  IF p_org_id IS NULL OR length(trim(p_org_id)) = 0 THEN
    RAISE EXCEPTION 'organization id required';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(stock_quantity, 0) = 0),
    COUNT(*) FILTER (WHERE COALESCE(stock_quantity, 0) > 0
                       AND COALESCE(stock_quantity, 0) <= COALESCE(min_stock, 0)),
    COALESCE(SUM(COALESCE(stock_quantity, 0) * COALESCE(cost_price, sale_price, 0)), 0),
    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')
  INTO v_total, v_out, v_low, v_value, v_recent
  FROM products
  WHERE organization_id = p_org_id
    AND deleted_at IS NULL
    AND (p_is_active IS NULL OR is_active = p_is_active);

  -- Categoría con más productos (nombre)
  SELECT c.name INTO v_top_cat
  FROM products p
  JOIN categories c ON c.id = p.category_id AND c.organization_id = p_org_id
  WHERE p.organization_id = p_org_id
    AND p.deleted_at IS NULL
    AND p.category_id IS NOT NULL
    AND (p_is_active IS NULL OR p.is_active = p_is_active)
  GROUP BY c.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'totalProducts',       v_total,
    'lowStockProducts',    v_low,
    'outOfStockProducts',  v_out,
    'totalValue',          round(v_value),
    'recentlyAdded',       v_recent,
    'topCategory',         COALESCE(v_top_cat, 'N/A')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_products_summary(text, boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_products_summary(text, boolean) IS
  'Resumen de productos por org (total, stock bajo/agotado, valor de inventario, recientes, categoría top) agregado en SQL.';
