-- =============================================================================
-- MIGRATION: 20260622_fix_category_counts_rpc
-- Fix: Category count RPC now includes fallback for orgs with internal categories
--
-- PROBLEM:
--   RPC was only counting orgs with explicit marketplace_category_id
--   Missing orgs without marketplace_category_id but with matching internal categories
--   Result: "Belleza: 32 productos" but actually only 6 from 1 org with valid products
--
-- SOLUTION:
--   Drop existing function and recreate with UNION for fallback matching
--   Fallback: Match orgs by internal category name when marketplace_category_id is NULL
--
-- =============================================================================

BEGIN;

-- Drop the existing function (required when changing return type or adding UNION)
DROP FUNCTION IF EXISTS public.get_marketplace_categories_with_counts() CASCADE;

-- Recreate with improved logic: explicit + fallback matching
CREATE OR REPLACE FUNCTION public.get_marketplace_categories_with_counts()
RETURNS TABLE (
  id            UUID,
  name          TEXT,
  slug          TEXT,
  description   TEXT,
  icon          TEXT,
  color         TEXT,
  image_url     TEXT,
  is_featured   BOOLEAN,
  sort_order    INTEGER,
  view_count    BIGINT,
  click_count   BIGINT,
  org_count     BIGINT,
  product_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mc.id,
    mc.name,
    mc.slug,
    mc.description,
    mc.icon,
    mc.color,
    mc.image_url,
    mc.is_featured,
    mc.sort_order,
    COALESCE(mc.view_count, 0) as view_count,
    COALESCE(mc.click_count, 0) as click_count,
    COUNT(DISTINCT o.id)  AS org_count,
    COUNT(DISTINCT p.id)  AS product_count
  FROM public.marketplace_categories mc
  LEFT JOIN (
    -- EXPLICIT: Orgs with marketplace_category_id set
    SELECT DISTINCT o.id, mc.id as marketplace_category_id
    FROM public.organizations o
    CROSS JOIN public.marketplace_categories mc
    WHERE o.subscription_status IN ('ACTIVE', 'TRIAL')
      AND o.marketplace_category_id = mc.id

    UNION

    -- FALLBACK: Orgs WITHOUT marketplace_category_id but with internal categories matching
    SELECT DISTINCT o.id, mc.id as marketplace_category_id
    FROM public.organizations o
    CROSS JOIN public.marketplace_categories mc
    INNER JOIN public.products p ON p.organization_id = o.id
        AND p.is_active = TRUE
        AND p.is_public = TRUE
        AND p.deleted_at IS NULL
    INNER JOIN public.categories c ON c.id = p.category_id
        AND LOWER(TRIM(c.name)) = LOWER(TRIM(mc.name))
    WHERE o.subscription_status IN ('ACTIVE', 'TRIAL')
        AND o.marketplace_category_id IS NULL
  ) o ON o.marketplace_category_id = mc.id
  LEFT JOIN public.products p
    ON  p.organization_id = o.id
    AND p.is_active = TRUE
    AND p.is_public = TRUE
    AND p.deleted_at IS NULL
  WHERE mc.is_active = TRUE
  GROUP BY
    mc.id, mc.name, mc.slug, mc.description, mc.icon, mc.color,
    mc.image_url, mc.is_featured, mc.sort_order, mc.view_count, mc.click_count
  ORDER BY
    mc.is_featured DESC,
    mc.view_count  DESC,
    mc.sort_order  ASC,
    mc.name        ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_categories_with_counts() TO anon, authenticated;

COMMENT ON FUNCTION public.get_marketplace_categories_with_counts() IS
  'Retorna marketplace_categories con conteo de orgs y productos (explicit + fallback por categoría interna).';

COMMIT;
