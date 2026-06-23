-- =============================================================================
-- MIGRATION: 20260517_category_tracking
-- Tracking de visitas y clicks en categorías del marketplace público.
--
-- view_count  → se incrementa cuando un usuario visita /home/categorias/[slug]
-- click_count → se incrementa cuando un usuario hace click en una category card
--
-- La función track_marketplace_category usa SECURITY DEFINER para poder
-- escribir sin exponer UPDATE público en la tabla (que tiene RLS admin-only).
-- =============================================================================

BEGIN;

-- Contadores de analítica en marketplace_categories
ALTER TABLE public.marketplace_categories
  ADD COLUMN IF NOT EXISTS view_count  BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.marketplace_categories.view_count  IS 'Visitas a /home/categorias/[slug]. Incrementado por RPC.';
COMMENT ON COLUMN public.marketplace_categories.click_count IS 'Clicks en cards del marketplace. Incrementado por RPC.';

-- Índice para ordenar por popularidad
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_views
  ON public.marketplace_categories (view_count DESC)
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- RPC: track_marketplace_category
-- Incrementa view_count o click_count de forma segura.
-- Accesible por anon/authenticated sin exponer UPDATE en la tabla.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_marketplace_category(
  p_slug  TEXT,
  p_event TEXT   -- 'view' | 'click'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event = 'view' THEN
    UPDATE public.marketplace_categories
    SET view_count = view_count + 1
    WHERE slug = p_slug AND is_active = TRUE;

  ELSIF p_event = 'click' THEN
    UPDATE public.marketplace_categories
    SET click_count = click_count + 1
    WHERE slug = p_slug AND is_active = TRUE;
  END IF;
  -- Eventos desconocidos se ignoran silenciosamente (no error)
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_marketplace_category(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.track_marketplace_category(TEXT, TEXT) IS
  'Incrementa view_count (event=view) o click_count (event=click) de una marketplace_category por slug. Seguro para uso público.';

-- ---------------------------------------------------------------------------
-- Actualizar la RPC get_marketplace_categories_with_counts
-- para incluir view_count y click_count en el resultado.
-- Ordenamiento híbrido: featured primero, dentro de cada grupo por view_count.
-- ---------------------------------------------------------------------------
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
    mc.view_count,
    mc.click_count,
    COUNT(DISTINCT o.id)  AS org_count,
    COUNT(DISTINCT p.id)  AS product_count
  FROM public.marketplace_categories mc
  LEFT JOIN (
    -- Explicit marketplace_category_id
    SELECT DISTINCT o.id, mc.id as marketplace_category_id
    FROM public.organizations o
    WHERE o.subscription_status IN ('ACTIVE', 'TRIAL')
    UNION
    -- Fallback: organizations with internal categories matching marketplace category name
    SELECT DISTINCT o.id, mc.id as marketplace_category_id
    FROM public.organizations o
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
    mc.is_featured DESC,   -- destacadas primero
    mc.view_count  DESC,   -- dentro de cada grupo, las más visitadas arriba
    mc.sort_order  ASC,    -- fallback: orden editorial
    mc.name        ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_marketplace_categories_with_counts() TO anon, authenticated;

COMMIT;
