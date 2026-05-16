-- Server-side sales KPIs for a given org + window.
-- Returns a single jsonb with revenue, count, avg ticket, gross margin,
-- payment-method breakdown, top products, and a comparison vs the
-- equivalent previous window (same length, ending at the window start).
--
-- Design notes
--   * SECURITY DEFINER + SET search_path locks lookups to public/pg_catalog.
--   * The caller MUST pass p_org_id explicitly. RLS does not apply inside
--     a SECURITY DEFINER function, so the WHERE clauses enforce isolation.
--   * `gross_margin` is null-safe: products with no cost_price contribute
--     unit_price * quantity to gross_margin (treated as 100% margin) so
--     orgs that haven't loaded COGS still see *some* number — they should
--     fix their catalog rather than show 0.

CREATE OR REPLACE FUNCTION public.get_sales_kpis(
  p_org_id text,
  p_from   timestamptz,
  p_to     timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_window_seconds bigint := EXTRACT(EPOCH FROM (p_to - p_from))::bigint;
  v_prev_from timestamptz := p_from - (p_to - p_from);
  v_prev_to   timestamptz := p_from;
  v_result jsonb;
BEGIN
  IF p_org_id IS NULL OR length(trim(p_org_id)) = 0 THEN
    RAISE EXCEPTION 'organization id required';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'invalid window: from must precede to';
  END IF;

  WITH
  current_sales AS (
    SELECT s.id, s.total, s.payment_method
    FROM sales s
    WHERE s.organization_id = p_org_id
      AND s.created_at >= p_from
      AND s.created_at <  p_to
  ),
  current_items AS (
    SELECT si.quantity,
           si.unit_price,
           COALESCE(p.cost_price, 0)::numeric AS cost_price,
           si.product_id,
           p.name AS product_name,
           p.sku
    FROM sale_items si
    JOIN current_sales cs ON cs.id = si.sale_id
    LEFT JOIN products p ON p.id = si.product_id
  ),
  current_agg AS (
    SELECT
      COALESCE(SUM(total), 0)::numeric AS revenue,
      COUNT(*)::int                    AS transactions,
      COALESCE(AVG(total), 0)::numeric AS avg_ticket
    FROM current_sales
  ),
  margin_agg AS (
    SELECT
      COALESCE(SUM((unit_price - cost_price) * quantity), 0)::numeric AS gross_margin,
      COALESCE(SUM(unit_price * quantity), 0)::numeric                AS gross_revenue
    FROM current_items
  ),
  payment_agg AS (
    SELECT
      jsonb_object_agg(method, amount) AS by_method
    FROM (
      SELECT
        CASE upper(coalesce(payment_method, ''))
          WHEN 'CASH' THEN 'cash'
          WHEN 'EFECTIVO' THEN 'cash'
          WHEN 'CARD' THEN 'card'
          WHEN 'TARJETA' THEN 'card'
          WHEN 'TRANSFER' THEN 'transfer'
          WHEN 'TRANSFERENCIA' THEN 'transfer'
          WHEN 'BANK_TRANSFER' THEN 'transfer'
          ELSE 'other'
        END AS method,
        COALESCE(SUM(total), 0)::numeric AS amount
      FROM current_sales
      GROUP BY 1
    ) p
  ),
  top_products_qty AS (
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.qty DESC) AS list
    FROM (
      SELECT product_id, product_name, sku,
             SUM(quantity)::int AS qty,
             SUM(quantity * unit_price)::numeric AS revenue
      FROM current_items
      GROUP BY product_id, product_name, sku
      ORDER BY qty DESC
      LIMIT 5
    ) t
  ),
  top_products_rev AS (
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.revenue DESC) AS list
    FROM (
      SELECT product_id, product_name, sku,
             SUM(quantity)::int AS qty,
             SUM(quantity * unit_price)::numeric AS revenue
      FROM current_items
      GROUP BY product_id, product_name, sku
      ORDER BY revenue DESC
      LIMIT 5
    ) t
  ),
  prev_agg AS (
    SELECT
      COALESCE(SUM(total), 0)::numeric AS revenue,
      COUNT(*)::int                    AS transactions
    FROM sales
    WHERE organization_id = p_org_id
      AND created_at >= v_prev_from
      AND created_at <  v_prev_to
  )
  SELECT jsonb_build_object(
    'window',          jsonb_build_object('from', p_from, 'to', p_to, 'seconds', v_window_seconds),
    'revenue',         (SELECT revenue FROM current_agg),
    'transactions',    (SELECT transactions FROM current_agg),
    'avg_ticket',      (SELECT avg_ticket FROM current_agg),
    'gross_margin',    (SELECT gross_margin FROM margin_agg),
    'gross_margin_pct',
      CASE WHEN (SELECT gross_revenue FROM margin_agg) > 0
           THEN ROUND(((SELECT gross_margin FROM margin_agg) / (SELECT gross_revenue FROM margin_agg)) * 100, 2)
           ELSE 0
      END,
    'payment_breakdown', COALESCE((SELECT by_method FROM payment_agg), '{}'::jsonb),
    'top_products_by_qty',     COALESCE((SELECT list FROM top_products_qty), '[]'::jsonb),
    'top_products_by_revenue', COALESCE((SELECT list FROM top_products_rev), '[]'::jsonb),
    'previous_window', jsonb_build_object(
      'from',         v_prev_from,
      'to',           v_prev_to,
      'revenue',      (SELECT revenue FROM prev_agg),
      'transactions', (SELECT transactions FROM prev_agg)
    ),
    'revenue_delta_pct',
      CASE WHEN (SELECT revenue FROM prev_agg) > 0
           THEN ROUND((((SELECT revenue FROM current_agg) - (SELECT revenue FROM prev_agg))
                     / (SELECT revenue FROM prev_agg)) * 100, 2)
           ELSE NULL
      END,
    'transactions_delta_pct',
      CASE WHEN (SELECT transactions FROM prev_agg) > 0
           THEN ROUND((((SELECT transactions FROM current_agg) - (SELECT transactions FROM prev_agg))::numeric
                     / (SELECT transactions FROM prev_agg)::numeric) * 100, 2)
           ELSE NULL
      END
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_kpis(text, timestamptz, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.get_sales_kpis(text, timestamptz, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_sales_kpis IS
  'Single-call sales KPIs for an org + window (revenue, txns, avg ticket, gross margin, payment breakdown, top products, vs previous-window deltas).';
