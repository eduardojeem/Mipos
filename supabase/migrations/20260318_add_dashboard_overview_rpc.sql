CREATE OR REPLACE FUNCTION public.get_dashboard_overview_v1(
  org_id uuid,
  date_start timestamptz DEFAULT date_trunc('day', now()),
  month_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS TABLE(
  today_sales numeric,
  month_sales numeric,
  total_customers bigint,
  total_products bigint,
  low_stock_count bigint,
  today_sales_count bigint,
  average_ticket numeric,
  active_orders bigint,
  web_orders jsonb,
  recent_sales jsonb,
  last_updated timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today_sales numeric := 0;
  v_month_sales numeric := 0;
  v_total_customers bigint := 0;
  v_total_products bigint := 0;
  v_low_stock_count bigint := 0;
  v_today_sales_count bigint := 0;
  v_average_ticket numeric := 0;
  v_pending_orders bigint := 0;
  v_confirmed_orders bigint := 0;
  v_preparing_orders bigint := 0;
  v_shipped_orders bigint := 0;
  v_delivered_orders bigint := 0;
  v_today_orders_total bigint := 0;
  v_today_orders_revenue numeric := 0;
  v_recent_sales jsonb := '[]'::jsonb;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN s.created_at >= date_start THEN s.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN s.created_at >= month_start THEN s.total ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE s.created_at >= date_start)
  INTO
    v_today_sales,
    v_month_sales,
    v_today_sales_count
  FROM public.sales AS s
  WHERE s.organization_id = org_id
    AND s.created_at >= month_start;

  SELECT COUNT(*) INTO v_total_customers
  FROM public.customers AS c
  WHERE c.organization_id = org_id
    AND COALESCE(c.is_active, true);

  SELECT COUNT(*) INTO v_total_products
  FROM public.products AS p
  WHERE p.organization_id = org_id
    AND COALESCE(p.is_active, true);

  SELECT COUNT(*) INTO v_low_stock_count
  FROM public.products AS p
  WHERE p.organization_id = org_id
    AND COALESCE(p.is_active, true)
    AND p.stock_quantity <= p.min_stock;

  BEGIN
    SELECT
      COUNT(*) FILTER (WHERE s.status = 'PENDING'),
      COUNT(*) FILTER (WHERE s.status = 'CONFIRMED'),
      COUNT(*) FILTER (WHERE s.status = 'PREPARING'),
      COUNT(*) FILTER (WHERE s.status = 'SHIPPED'),
      COUNT(*) FILTER (WHERE s.status = 'DELIVERED'),
      COUNT(*) FILTER (WHERE s.created_at >= date_start AND s.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED')),
      COALESCE(SUM(CASE WHEN s.created_at >= date_start AND s.status <> 'CANCELLED' THEN s.total ELSE 0 END), 0)
    INTO
      v_pending_orders,
      v_confirmed_orders,
      v_preparing_orders,
      v_shipped_orders,
      v_delivered_orders,
      v_today_orders_total,
      v_today_orders_revenue
    FROM public.sales AS s
    WHERE s.organization_id = org_id;
  EXCEPTION
    WHEN undefined_column THEN
      v_pending_orders := 0;
      v_confirmed_orders := 0;
      v_preparing_orders := 0;
      v_shipped_orders := 0;
      v_delivered_orders := 0;
      v_today_orders_total := 0;
      v_today_orders_revenue := 0;
  END;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', recent.id,
        'customer_name', recent.customer_name,
        'total', recent.total,
        'created_at', recent.created_at,
        'payment_method', recent.payment_method
      )
      ORDER BY recent.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_recent_sales
  FROM (
    SELECT
      s.id,
      COALESCE(c.name, 'Cliente General') AS customer_name,
      s.total,
      s.created_at,
      lower(COALESCE(s.payment_method, 'cash')) AS payment_method
    FROM public.sales AS s
    LEFT JOIN public.customers AS c ON c.id = s.customer_id
    WHERE s.organization_id = org_id
    ORDER BY s.created_at DESC
    LIMIT 6
  ) AS recent;

  IF v_today_sales_count > 0 THEN
    v_average_ticket := v_today_sales / v_today_sales_count;
  END IF;

  RETURN QUERY
  SELECT
    v_today_sales,
    v_month_sales,
    v_total_customers,
    v_total_products,
    v_low_stock_count,
    v_today_sales_count,
    v_average_ticket,
    v_pending_orders + v_confirmed_orders + v_preparing_orders,
    jsonb_build_object(
      'pending', v_pending_orders,
      'confirmed', v_confirmed_orders,
      'preparing', v_preparing_orders,
      'shipped', v_shipped_orders,
      'delivered', v_delivered_orders,
      'today_total', v_today_orders_total,
      'today_revenue', v_today_orders_revenue
    ),
    v_recent_sales,
    now();
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_overview_v1(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_v1(uuid, timestamptz, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics_v1(
  org_id uuid,
  range_key text DEFAULT '30d'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  range_start timestamptz;
  previous_start timestamptz;
  bucket_unit text;
  payload jsonb;
BEGIN
  CASE range_key
    WHEN '24h' THEN
      range_start := now() - interval '24 hours';
      previous_start := range_start - interval '24 hours';
      bucket_unit := 'hour';
    WHEN '7d' THEN
      range_start := date_trunc('day', now()) - interval '6 days';
      previous_start := range_start - interval '7 days';
      bucket_unit := 'day';
    WHEN '90d' THEN
      range_start := date_trunc('day', now()) - interval '89 days';
      previous_start := range_start - interval '90 days';
      bucket_unit := 'week';
    WHEN '1y' THEN
      range_start := date_trunc('month', now()) - interval '11 months';
      previous_start := range_start - interval '12 months';
      bucket_unit := 'month';
    ELSE
      range_start := date_trunc('day', now()) - interval '29 days';
      previous_start := range_start - interval '30 days';
      bucket_unit := 'day';
  END CASE;

  WITH sales_current AS (
    SELECT s.id, s.total, s.created_at
    FROM public.sales AS s
    WHERE s.organization_id = org_id
      AND s.created_at >= range_start
  ),
  sales_previous AS (
    SELECT s.id, s.total
    FROM public.sales AS s
    WHERE s.organization_id = org_id
      AND s.created_at >= previous_start
      AND s.created_at < range_start
  ),
  daily AS (
    SELECT
      date_trunc(bucket_unit, s.created_at) AS bucket,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(s.total), 0)::numeric AS revenue
    FROM sales_current AS s
    GROUP BY 1
    ORDER BY 1
  ),
  categories AS (
    SELECT
      COALESCE(c.name, 'Sin categoria') AS name,
      COALESCE(SUM(si.quantity * si.unit_price), 0)::numeric AS value,
      COUNT(DISTINCT si.product_id)::bigint AS items
    FROM public.sale_items AS si
    INNER JOIN public.sales AS s ON s.id = si.sale_id
    LEFT JOIN public.products AS p ON p.id = si.product_id
    LEFT JOIN public.categories AS c ON c.id = p.category_id
    WHERE s.organization_id = org_id
      AND s.created_at >= range_start
    GROUP BY 1
    ORDER BY value DESC
    LIMIT 6
  ),
  top_products AS (
    SELECT
      p.id,
      p.name,
      COALESCE(c.name, 'Sin categoria') AS category,
      SUM(si.quantity)::bigint AS sales,
      COALESCE(SUM(si.quantity * si.unit_price), 0)::numeric AS revenue,
      COALESCE(p.stock_quantity, 0)::bigint AS stock
    FROM public.sale_items AS si
    INNER JOIN public.sales AS s ON s.id = si.sale_id
    INNER JOIN public.products AS p ON p.id = si.product_id
    LEFT JOIN public.categories AS c ON c.id = p.category_id
    WHERE s.organization_id = org_id
      AND s.created_at >= range_start
    GROUP BY p.id, p.name, c.name, p.stock_quantity
    ORDER BY revenue DESC, sales DESC
    LIMIT 8
  ),
  totals AS (
    SELECT
      (SELECT COUNT(*)::bigint FROM sales_current) AS orders,
      (SELECT COALESCE(SUM(total), 0)::numeric FROM sales_current) AS revenue,
      (SELECT COUNT(*)::bigint FROM sales_previous) AS previous_orders,
      (SELECT COALESCE(SUM(total), 0)::numeric FROM sales_previous) AS previous_revenue
  )
  SELECT jsonb_build_object(
    'daily',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'day', daily.bucket,
              'orders', daily.orders,
              'revenue', daily.revenue
            )
            ORDER BY daily.bucket
          )
          FROM daily
        ),
        '[]'::jsonb
      ),
    'categories',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', categories.name,
              'value', categories.value,
              'items', categories.items
            )
            ORDER BY categories.value DESC
          )
          FROM categories
        ),
        '[]'::jsonb
      ),
    'topProducts',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', top_products.id,
              'name', top_products.name,
              'category', top_products.category,
              'sales', top_products.sales,
              'revenue', top_products.revenue,
              'stock', top_products.stock
            )
            ORDER BY top_products.revenue DESC
          )
          FROM top_products
        ),
        '[]'::jsonb
      ),
    'totals',
      (
        SELECT jsonb_build_object(
          'orders', totals.orders,
          'revenue', totals.revenue,
          'previousOrders', totals.previous_orders,
          'previousRevenue', totals.previous_revenue
        )
        FROM totals
      ),
    'lastUpdated', now()
  )
  INTO payload;

  RETURN COALESCE(payload, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_analytics_v1(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_v1(uuid, text) TO authenticated, service_role;
