-- =============================================================================
-- MIGRATION: 20260619_dashboard_overview_rpc
-- RPC function to consolidate dashboard overview into a single DB call.
-- Replaces 7 sequential queries that previously pulled up to 10K rows each.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_overview_v1(
  org_id UUID,
  date_start TIMESTAMPTZ DEFAULT (CURRENT_DATE::TIMESTAMPTZ),
  month_start TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', CURRENT_DATE)::TIMESTAMPTZ)
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_today_sales NUMERIC := 0;
  v_today_count INT := 0;
  v_month_sales NUMERIC := 0;
  v_total_customers INT := 0;
  v_total_products INT := 0;
  v_low_stock_count INT := 0;
  v_avg_ticket NUMERIC := 0;
  v_recent_sales JSON := '[]'::JSON;
  v_web_orders JSON;
BEGIN
  -- Today's sales summary
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_today_sales, v_today_count
  FROM public.sales
  WHERE organization_id = org_id
    AND created_at >= date_start;

  -- Month sales total
  SELECT COALESCE(SUM(total), 0)
  INTO v_month_sales
  FROM public.sales
  WHERE organization_id = org_id
    AND created_at >= month_start;

  -- Total active customers
  SELECT COUNT(*)
  INTO v_total_customers
  FROM public.customers
  WHERE organization_id = org_id;

  -- Total active visible products
  SELECT COUNT(*)
  INTO v_total_products
  FROM public.products
  WHERE organization_id = org_id
    AND is_active = TRUE
    AND (deleted_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'deleted_at'
    ));

  -- Low stock products count
  SELECT COUNT(*)
  INTO v_low_stock_count
  FROM public.products
  WHERE organization_id = org_id
    AND is_active = TRUE
    AND stock_quantity <= min_stock;

  -- Average ticket (today)
  IF v_today_count > 0 THEN
    v_avg_ticket := v_today_sales / v_today_count;
  END IF;

  -- Recent sales (last 6)
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::JSON)
  INTO v_recent_sales
  FROM (
    SELECT
      s.id,
      s.total,
      s.created_at,
      s.payment_method,
      COALESCE(c.name, 'Cliente General') AS customer_name
    FROM public.sales s
    LEFT JOIN public.customers c ON c.id = s.customer_id
    WHERE s.organization_id = org_id
    ORDER BY s.created_at DESC
    LIMIT 6
  ) t;

  -- Web orders summary (last 30 days active statuses)
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'PENDING'),
    'confirmed', COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
    'preparing', COUNT(*) FILTER (WHERE status = 'PREPARING'),
    'shipped', COUNT(*) FILTER (WHERE status = 'SHIPPED'),
    'delivered', COUNT(*) FILTER (WHERE status = 'DELIVERED'),
    'today_total', COUNT(*) FILTER (WHERE created_at >= date_start),
    'today_revenue', COALESCE(SUM(total) FILTER (WHERE created_at >= date_start), 0)
  )
  INTO v_web_orders
  FROM public.sales
  WHERE organization_id = org_id
    AND status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED')
    AND created_at >= (NOW() - INTERVAL '30 days');

  RETURN json_build_object(
    'today_sales', v_today_sales,
    'today_sales_count', v_today_count,
    'month_sales', v_month_sales,
    'total_customers', v_total_customers,
    'total_products', v_total_products,
    'low_stock_count', v_low_stock_count,
    'average_ticket', ROUND(v_avg_ticket, 2),
    'active_orders', 0,
    'web_orders', COALESCE(v_web_orders, '{}'::JSON),
    'recent_sales', v_recent_sales,
    'last_updated', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_v1(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_dashboard_overview_v1 IS
  'Consolidated dashboard overview in a single DB call. Replaces 7 sequential queries.';

COMMIT;
