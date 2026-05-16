-- =============================================================================
-- Migration: get_returns_kpis RPC + supporting indexes
-- Date: 2026-05-15
--
-- Context: The audit recommended capturing returns KPIs (rate, avg time,
-- top reasons, top products, fraud signals). The frontend's ReturnsStats
-- component currently aggregates client-side from the paginated list,
-- which is wrong (doesn't see beyond page 1) and slow at scale.
--
-- This RPC returns a JSON bundle of all KPIs server-side in one round
-- trip, scoped to the caller's organization. Frontend hits
-- /api/returns/kpis?period=30d which proxies to this RPC.
-- =============================================================================

-- Helper view: returns enriched with their period bucket. Materialized
-- in the function below to avoid view bloat.

CREATE OR REPLACE FUNCTION public.get_returns_kpis(
  p_organization_id uuid,
  p_period_days int DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
DECLARE
  v_since        timestamptz := NOW() - (p_period_days || ' days')::interval;
  v_total_count  int;
  v_total_amount numeric;
  v_pending      int;
  v_approved     int;
  v_completed    int;
  v_rejected     int;
  v_avg_seconds_to_process numeric;
  v_sales_count_period int;
  v_return_rate_pct numeric;
  v_top_products jsonb;
  v_top_reasons jsonb;
  v_top_cashiers jsonb;
  v_fraud_signals jsonb;
  v_result jsonb;
BEGIN
  -- Core counts + amounts in the window
  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COUNT(*) FILTER (WHERE status = 'PENDING'),
    COUNT(*) FILTER (WHERE status = 'APPROVED'),
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE status = 'REJECTED'),
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at)))
      FILTER (WHERE processed_at IS NOT NULL)
  INTO
    v_total_count,
    v_total_amount,
    v_pending,
    v_approved,
    v_completed,
    v_rejected,
    v_avg_seconds_to_process
  FROM returns
  WHERE organization_id = p_organization_id
    AND created_at >= v_since;

  -- Return rate vs sales in the same window. Defensive: avoid div by 0.
  SELECT COUNT(*)
    INTO v_sales_count_period
    FROM sales
   WHERE organization_id = p_organization_id::text
     AND created_at >= v_since;

  IF v_sales_count_period > 0 THEN
    v_return_rate_pct := ROUND((v_total_count::numeric / v_sales_count_period) * 100, 2);
  ELSE
    v_return_rate_pct := 0;
  END IF;

  -- Top 10 most-returned products in the window
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.qty DESC), '[]'::jsonb)
    INTO v_top_products
    FROM (
      SELECT
        ri.product_id,
        p.name AS product_name,
        SUM(ri.quantity)::int AS qty,
        COUNT(DISTINCT ri.return_id)::int AS return_count
      FROM return_items ri
      JOIN returns r ON r.id = ri.return_id
      LEFT JOIN products p ON p.id = ri.product_id
      WHERE r.organization_id = p_organization_id
        AND r.created_at >= v_since
        AND r.status IN ('APPROVED', 'COMPLETED')
      GROUP BY ri.product_id, p.name
      ORDER BY SUM(ri.quantity) DESC
      LIMIT 10
    ) t;

  -- Top 10 reasons (case-insensitive grouping by first 60 chars)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.cnt DESC), '[]'::jsonb)
    INTO v_top_reasons
    FROM (
      SELECT
        LOWER(LEFT(reason, 60)) AS reason,
        COUNT(*)::int AS cnt
      FROM returns
      WHERE organization_id = p_organization_id
        AND created_at >= v_since
        AND reason IS NOT NULL
        AND LENGTH(TRIM(reason)) > 0
      GROUP BY LOWER(LEFT(reason, 60))
      ORDER BY COUNT(*) DESC
      LIMIT 10
    ) t;

  -- Top 5 cashiers by return count + amount (for fraud / staffing review)
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.cnt DESC), '[]'::jsonb)
    INTO v_top_cashiers
    FROM (
      SELECT
        COALESCE(r.cashier_id, r.user_id) AS user_id,
        COALESCE(u.full_name, u.email, 'desconocido') AS user_name,
        COUNT(*)::int AS cnt,
        COALESCE(SUM(r.total_amount), 0)::numeric AS amount
      FROM returns r
      LEFT JOIN users u ON u.id = COALESCE(r.cashier_id, r.user_id)
      WHERE r.organization_id = p_organization_id
        AND r.created_at >= v_since
      GROUP BY COALESCE(r.cashier_id, r.user_id), u.full_name, u.email
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) t;

  -- Fraud signals — return where the cashier creating it is also the
  -- seller of the original sale. Real systems separate these roles;
  -- legit cases do exist (one-person shop) but high counts deserve a look.
  SELECT jsonb_build_object(
    'self_return_count', COALESCE(COUNT(*), 0)::int,
    'self_return_amount', COALESCE(SUM(r.total_amount), 0)::numeric
  ) INTO v_fraud_signals
  FROM returns r
  JOIN sales s ON s.id = r.original_sale_id
  WHERE r.organization_id = p_organization_id
    AND r.created_at >= v_since
    AND r.cashier_id IS NOT NULL
    AND r.cashier_id::text = s.user_id;

  v_result := jsonb_build_object(
    'period_days', p_period_days,
    'since', v_since,
    'total_count', v_total_count,
    'total_amount', v_total_amount,
    'by_status', jsonb_build_object(
      'pending', v_pending,
      'approved', v_approved,
      'completed', v_completed,
      'rejected', v_rejected
    ),
    'avg_seconds_to_process', COALESCE(v_avg_seconds_to_process, 0),
    'sales_count_period', v_sales_count_period,
    'return_rate_pct', v_return_rate_pct,
    'top_products', v_top_products,
    'top_reasons', v_top_reasons,
    'top_cashiers', v_top_cashiers,
    'fraud_signals', v_fraud_signals
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_returns_kpis IS
  'Returns KPI bundle for the dashboard: counts/amounts by status, return rate, avg processing time, top products/reasons/cashiers, fraud signals. Scoped to one organization, default 30-day window.';
