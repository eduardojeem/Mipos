-- =============================================================================
-- MIGRATION: 20260620_get_sales_summary
-- RPC que calcula el resumen de ventas (hoy/semana/mes/mes-pasado) en SQL,
-- en una sola llamada, en vez de traer todas las filas al server y sumar en JS.
-- Tz-aware: los límites de día/semana/mes se calculan en la zona de la org
-- (default America/Asuncion) para que "hoy" no quede corrido por UTC.
--
-- Consistente con get_sales_kpis: scopea por organization_id y NO filtra por
-- status (cuenta todas las ventas con total).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_org_id text,
  p_tz     text DEFAULT 'America/Asuncion'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_now            timestamp;
  v_today          timestamp;
  v_week           timestamp;
  v_month          timestamp;
  v_last_month     timestamp;
  v_today_sales    numeric := 0;
  v_today_count    int := 0;
  v_week_sales     numeric := 0;
  v_week_count     int := 0;
  v_month_sales    numeric := 0;
  v_month_count    int := 0;
  v_last_sales     numeric := 0;
  v_last_count     int := 0;
  v_avg_ticket     numeric := 0;
  v_top_method     text := 'N/A';
  v_growth         numeric := 0;
BEGIN
  IF p_org_id IS NULL OR length(trim(p_org_id)) = 0 THEN
    RAISE EXCEPTION 'organization id required';
  END IF;

  -- "ahora" en hora local de la organización
  v_now   := now() AT TIME ZONE p_tz;
  v_today := date_trunc('day',   v_now);
  v_week  := date_trunc('week',  v_now);   -- semana ISO (lunes)
  v_month := date_trunc('month', v_now);
  v_last_month := v_month - interval '1 month';

  -- Agregados por ventana (created_at convertido a hora local para comparar)
  SELECT
    COALESCE(SUM(total) FILTER (WHERE local_ts >= v_today), 0),
    COUNT(*)            FILTER (WHERE local_ts >= v_today),
    COALESCE(SUM(total) FILTER (WHERE local_ts >= v_week), 0),
    COUNT(*)            FILTER (WHERE local_ts >= v_week),
    COALESCE(SUM(total) FILTER (WHERE local_ts >= v_month), 0),
    COUNT(*)            FILTER (WHERE local_ts >= v_month),
    COALESCE(SUM(total) FILTER (WHERE local_ts >= v_last_month AND local_ts < v_month), 0),
    COUNT(*)            FILTER (WHERE local_ts >= v_last_month AND local_ts < v_month)
  INTO
    v_today_sales, v_today_count,
    v_week_sales,  v_week_count,
    v_month_sales, v_month_count,
    v_last_sales,  v_last_count
  FROM (
    SELECT s.total, (s.created_at AT TIME ZONE p_tz) AS local_ts
    FROM sales s
    WHERE s.organization_id = p_org_id
      AND s.created_at >= ((v_last_month) AT TIME ZONE p_tz)  -- acota el scan al rango usado
  ) q;

  v_avg_ticket := CASE WHEN v_month_count > 0 THEN v_month_sales / v_month_count ELSE 0 END;

  -- Método de pago top del mes (normalizado como en get_sales_kpis)
  SELECT method INTO v_top_method
  FROM (
    SELECT
      CASE upper(coalesce(s.payment_method::text, ''))
        WHEN 'CASH' THEN 'Efectivo'
        WHEN 'EFECTIVO' THEN 'Efectivo'
        WHEN 'CARD' THEN 'Tarjeta'
        WHEN 'TARJETA' THEN 'Tarjeta'
        WHEN 'TRANSFER' THEN 'Transferencia'
        WHEN 'TRANSFERENCIA' THEN 'Transferencia'
        WHEN 'BANK_TRANSFER' THEN 'Transferencia'
        ELSE 'Otro'
      END AS method,
      COUNT(*) AS c
    FROM sales s
    WHERE s.organization_id = p_org_id
      AND (s.created_at AT TIME ZONE p_tz) >= v_month
    GROUP BY 1
    ORDER BY c DESC
    LIMIT 1
  ) m;

  v_growth := CASE
    WHEN v_last_sales > 0 THEN round(((v_month_sales - v_last_sales) / v_last_sales) * 100, 1)
    WHEN v_month_sales > 0 THEN 100
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'todaySales',        v_today_sales,
    'todayCount',        v_today_count,
    'weekSales',         v_week_sales,
    'weekCount',         v_week_count,
    'monthSales',        v_month_sales,
    'monthCount',        v_month_count,
    'avgTicket',         v_avg_ticket,
    'topPaymentMethod',  COALESCE(v_top_method, 'N/A'),
    'growthPercentage',  v_growth
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_summary(text, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_sales_summary(text, text) IS
  'Resumen de ventas por org (hoy/semana/mes/mes-pasado, avg ticket, método top, crecimiento MoM), agregado en SQL y tz-aware.';
