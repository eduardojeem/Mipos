-- Migration: Update Dashboard RPC Functions with Organization Filtering
-- Description: Adds organization_id parameter to all dashboard RPC functions for multitenancy support
-- Date: 2026-01-31

-- ============================================================================
-- Function: get_today_sales_summary
-- Description: Get today's sales summary filtered by organization
-- ============================================================================
CREATE OR REPLACE FUNCTION get_today_sales_summary(
  date_start timestamp,
  org_id uuid
)
RETURNS TABLE(total_sales numeric, sales_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(SUM(total), 0) as total_sales,
    COUNT(*) as sales_count
  FROM sales 
  WHERE created_at >= date_start
    AND organization_id = org_id;
$$;

COMMENT ON FUNCTION get_today_sales_summary IS 'Get today sales summary for a specific organization';

-- ============================================================================
-- Function: get_dashboard_counts
-- Description: Get dashboard basic counts filtered by organization
-- ============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_counts(org_id uuid)
RETURNS TABLE(
  customers_count bigint, 
  products_count bigint, 
  low_stock_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    (SELECT COUNT(*) FROM customers WHERE organization_id = org_id) as customers_count,
    (SELECT COUNT(*) FROM products WHERE organization_id = org_id) as products_count,
    0::bigint as low_stock_count; -- Stock column doesn't exist, return 0
$$;

COMMENT ON FUNCTION get_dashboard_counts IS 'Get dashboard counts for a specific organization';

-- ============================================================================
-- Function: get_orders_dashboard_stats
-- Description: Get web orders statistics filtered by organization
-- Note: Returns zeros if orders table doesn't exist
-- ============================================================================
CREATE OR REPLACE FUNCTION get_orders_dashboard_stats(org_id uuid)
RETURNS TABLE(
  pending_orders bigint,
  confirmed_orders bigint,
  preparing_orders bigint,
  shipped_orders bigint,
  delivered_orders bigint,
  total_orders_today bigint,
  orders_revenue_today numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Check if orders table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'orders'
  ) THEN
    -- Table exists, return real data
    RETURN QUERY
    SELECT 
      (SELECT COUNT(*) FROM orders WHERE status = 'PENDING' AND organization_id = org_id)::bigint as pending_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'CONFIRMED' AND organization_id = org_id)::bigint as confirmed_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'PREPARING' AND organization_id = org_id)::bigint as preparing_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'SHIPPED' AND organization_id = org_id)::bigint as shipped_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'DELIVERED' AND organization_id = org_id)::bigint as delivered_orders,
      (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND organization_id = org_id)::bigint as total_orders_today,
      COALESCE((SELECT SUM(total) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status != 'CANCELLED' AND organization_id = org_id), 0) as orders_revenue_today;
  ELSE
    -- Table doesn't exist, return zeros
    RETURN QUERY
    SELECT 
      0::bigint as pending_orders,
      0::bigint as confirmed_orders,
      0::bigint as preparing_orders,
      0::bigint as shipped_orders,
      0::bigint as delivered_orders,
      0::bigint as total_orders_today,
      0::numeric as orders_revenue_today;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_orders_dashboard_stats IS 'Get order statistics for a specific organization (returns zeros if orders table does not exist)';

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Test that functions exist and have correct signature
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname = 'get_today_sales_summary' 
    AND pronargs = 2
  ) = 1, 'get_today_sales_summary function not found or has wrong number of arguments';
  
  ASSERT (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname = 'get_dashboard_counts' 
    AND pronargs = 1
  ) = 1, 'get_dashboard_counts function not found or has wrong number of arguments';
  
  ASSERT (
    SELECT COUNT(*) FROM pg_proc 
    WHERE proname = 'get_orders_dashboard_stats' 
    AND pronargs = 1
  ) = 1, 'get_orders_dashboard_stats function not found or has wrong number of arguments';
  
  RAISE NOTICE 'All RPC functions updated successfully with organization filtering';
END $$;
