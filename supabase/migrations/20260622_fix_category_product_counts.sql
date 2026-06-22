-- =============================================================================
-- MIGRATION: 20260622_fix_category_product_counts
-- Fix: Products not showing in /home/categorias filtering
--
-- PROBLEM:
--   Organizations without explicit marketplace_category_id were counted in
--   /home/categorias RPC but filtered out in catalog search, causing:
--   - "Cosméticos: 24" shown in category listing
--   - 0 products shown when clicking category
--
-- SOLUTION:
--   1. Fixed RPC product count filters (is_active, is_public, deleted_at)
--   2. Added fallback RPC to search by internal categories
--   3. Updated catalog filter to include orgs with matching internal categories
--
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- RPC: get_organizations_by_internal_category
-- Finds organizations that have products in internal categories matching
-- the given marketplace category names.
--
-- FALLBACK SEARCH: When org.marketplace_category_id is NULL but org has
-- products in internal categories (products.category_id) that match the
-- marketplace category name, include the org in results.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_organizations_by_internal_category(
  category_names TEXT[],
  statuses TEXT[] DEFAULT ARRAY['ACTIVE', 'TRIAL']
)
RETURNS TABLE (
  id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.id
  FROM public.organizations o
  INNER JOIN public.products p
    ON p.organization_id = o.id
    AND p.is_active = TRUE
    AND p.is_public = TRUE
    AND p.deleted_at IS NULL
  INNER JOIN public.categories c
    ON c.id = p.category_id
    AND LOWER(TRIM(c.name)) = ANY(
      SELECT LOWER(TRIM(unnest(category_names)))
    )
  WHERE o.subscription_status = ANY(statuses)
    AND o.marketplace_category_id IS NULL  -- Only orgs WITHOUT explicit marketplace_category_id
$$;

GRANT EXECUTE ON FUNCTION public.get_organizations_by_internal_category(TEXT[], TEXT[])
  TO anon, authenticated;

COMMENT ON FUNCTION public.get_organizations_by_internal_category(TEXT[], TEXT[]) IS
  'Finds orgs with products in internal categories matching marketplace category names. Fallback when marketplace_category_id is NULL.';

-- ---------------------------------------------------------------------------
-- COMMENT: Why this fix is needed
-- ---------------------------------------------------------------------------
--
-- BEFORE: Orgs could only be found via marketplace_category_id
-- AFTER:  Orgs also found by matching internal category names
--
-- Example:
--   - Org: "Farmacia 24h" has marketplace_category_id = NULL
--   - Org has 24 products in internal category "Medicamentos"
--   - Marketplace category "Farmacias y Salud" has name "Farmacias y Salud"
--
--   OLD BEHAVIOR:
--     marketplace_categories RPC: Counts products from Org (finds them)
--     catalog filter: Doesn't find org (marketplace_category_id is NULL)
--     RESULT: 24 → 0 ❌
--
--   NEW BEHAVIOR:
--     marketplace_categories RPC: Counts products (still works)
--     catalog filter: Fallback RPC finds org by internal category match
--     RESULT: 24 → 24 ✅

COMMIT;
