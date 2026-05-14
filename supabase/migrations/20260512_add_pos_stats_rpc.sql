CREATE OR REPLACE FUNCTION public.get_pos_stats_v1(
  org_id uuid,
  day_start timestamptz,
  week_start timestamptz,
  month_start timestamptz,
  top_products_start timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH sales_scope AS (
    SELECT
      s.id,
      COALESCE(
        (to_jsonb(s) ->> 'total_amount')::numeric,
        (to_jsonb(s) ->> 'total')::numeric,
        0
      ) AS total_amount,
      s.created_at
    FROM public.sales AS s
    WHERE s.organization_id = org_id
      AND s.status = 'COMPLETED'
  ),
  sales_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN s.created_at >= day_start THEN s.total_amount ELSE 0 END), 0)::numeric AS today_sales,
      COUNT(*) FILTER (WHERE s.created_at >= day_start)::bigint AS today_transactions,
      COALESCE(SUM(CASE WHEN s.created_at >= week_start THEN s.total_amount ELSE 0 END), 0)::numeric AS week_sales,
      COUNT(*) FILTER (WHERE s.created_at >= week_start)::bigint AS week_transactions,
      COALESCE(SUM(CASE WHEN s.created_at >= month_start THEN s.total_amount ELSE 0 END), 0)::numeric AS month_sales,
      COUNT(*) FILTER (WHERE s.created_at >= month_start)::bigint AS month_transactions
    FROM sales_scope AS s
  ),
  top_products AS (
    SELECT
      si.product_id,
      COALESCE(MAX(p.name), 'Unknown Product') AS name,
      COALESCE(MAX(p.sku), '') AS sku,
      COALESCE(SUM(si.quantity), 0)::bigint AS quantity
    FROM public.sale_items AS si
    INNER JOIN sales_scope AS s ON s.id = si.sale_id
    LEFT JOIN public.products AS p
      ON p.id = si.product_id
     AND p.organization_id = org_id
    WHERE s.created_at >= top_products_start
    GROUP BY si.product_id
    ORDER BY quantity DESC, name ASC
    LIMIT 5
  ),
  low_stock_all AS (
    SELECT
      p.id,
      p.name,
      COALESCE(p.stock_quantity, 0)::bigint AS stock_quantity,
      GREATEST(COALESCE(p.min_stock, 5), 5)::bigint AS min_stock
    FROM public.products AS p
    WHERE p.organization_id = org_id
      AND COALESCE(p.is_active, true)
      AND COALESCE(p.stock_quantity, 0) <= GREATEST(COALESCE(p.min_stock, 5), 10)
  ),
  low_stock_limited AS (
    SELECT
      l.id,
      l.name,
      l.stock_quantity,
      l.min_stock,
      CASE
        WHEN l.stock_quantity = 0 THEN 'critical'
        WHEN l.stock_quantity <= 2 THEN 'high'
        ELSE 'medium'
      END AS urgency
    FROM low_stock_all AS l
    ORDER BY l.stock_quantity ASC, l.name ASC
    LIMIT 15
  )
  SELECT jsonb_build_object(
    'todaySales', st.today_sales,
    'todayTransactions', st.today_transactions,
    'weekSales', st.week_sales,
    'weekTransactions', st.week_transactions,
    'monthSales', st.month_sales,
    'monthTransactions', st.month_transactions,
    'averageTicket',
      CASE
        WHEN st.today_transactions > 0
          THEN ROUND(st.today_sales / st.today_transactions, 2)
        ELSE 0
      END,
    'topProducts',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', tp.product_id,
              'name', tp.name,
              'sku', tp.sku,
              'quantity', tp.quantity
            )
            ORDER BY tp.quantity DESC, tp.name ASC
          )
          FROM top_products AS tp
        ),
        '[]'::jsonb
      ),
    'lowStockProducts',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', ls.id,
              'name', ls.name,
              'stock_quantity', ls.stock_quantity,
              'min_stock', ls.min_stock,
              'urgency', ls.urgency
            )
            ORDER BY ls.stock_quantity ASC, ls.name ASC
          )
          FROM low_stock_limited AS ls
        ),
        '[]'::jsonb
      ),
    'lowStockCount',
      COALESCE((SELECT COUNT(*)::bigint FROM low_stock_all), 0),
    'criticalStockCount',
      COALESCE(
        (
          SELECT COUNT(*)::bigint
          FROM low_stock_all AS ls
          WHERE ls.stock_quantity = 0
        ),
        0
      ),
    'salesGrowth',
      CASE
        WHEN st.week_transactions > 0
         AND (st.week_transactions::numeric / 7) > 0
          THEN ROUND(((st.today_transactions::numeric / (st.week_transactions::numeric / 7)) - 1) * 100, 2)
        ELSE 0
      END,
    'lastUpdated', now()
  )
  FROM sales_totals AS st;
$$;

REVOKE ALL ON FUNCTION public.get_pos_stats_v1(uuid, timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pos_stats_v1(uuid, timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, service_role;
