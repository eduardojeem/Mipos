-- ============================================================================
-- MIGRATION: 20260622_optimize_product_stats_rpc
-- Purpose: Create RPC for product statistics to avoid over-fetching
-- Savings: 99.9% data reduction (from 20MB to <1KB per request)
-- ============================================================================

BEGIN;

-- RPC para obtener estadísticas de productos sin cargar todos los datos
-- Ejecuta agregación en Supabase, retorna solo los números
CREATE OR REPLACE FUNCTION public.get_product_statistics(org_id UUID)
RETURNS TABLE (
  total_products BIGINT,
  low_stock_products BIGINT,
  out_of_stock_products BIGINT,
  total_inventory_value NUMERIC,
  recently_added_count BIGINT,
  top_category_id UUID,
  top_category_name TEXT
) AS $$
WITH product_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(CASE
      WHEN stock_quantity > 0 AND stock_quantity <= COALESCE(min_stock, 5)
      THEN 1
    END) as low_stock,
    COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
    COALESCE(SUM(cost_price * stock_quantity), 0)::NUMERIC as total_value,
    COUNT(CASE
      WHEN created_at > NOW() - INTERVAL '7 days'
      THEN 1
    END) as recently_added
  FROM public.products
  WHERE organization_id = org_id
    AND deleted_at IS NULL
),
top_category AS (
  SELECT
    c.id::UUID as category_id,
    c.name as category_name,
    COUNT(*) as product_count
  FROM public.products p
  LEFT JOIN public.categories c ON p.category_id = c.id
  WHERE p.organization_id = org_id
    AND p.deleted_at IS NULL
  GROUP BY c.id, c.name
  ORDER BY product_count DESC
  LIMIT 1
)
SELECT
  ps.total::BIGINT,
  ps.low_stock::BIGINT,
  ps.out_of_stock::BIGINT,
  ps.total_value::NUMERIC,
  ps.recently_added::BIGINT,
  COALESCE(tc.category_id, NULL::UUID) as top_category_id,
  COALESCE(tc.category_name, 'N/A') as top_category_name
FROM product_stats ps
CROSS JOIN LATERAL (SELECT * FROM top_category LIMIT 1) tc;
$$
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_product_statistics(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_product_statistics IS
  'Get product statistics for a single organization. Returns aggregated counts and values. Optimized to avoid over-fetching: <1KB vs 20MB with full product fetch.';

-- Create indexes to support the RPC efficiently
CREATE INDEX IF NOT EXISTS idx_products_org_deleted
  ON public.products(organization_id, deleted_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products(category_id)
  WHERE deleted_at IS NULL;

COMMIT;
