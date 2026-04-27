DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promotions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.promotions ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE '✅ added deleted_at to promotions';
  ELSE
    RAISE NOTICE 'ℹ️ deleted_at already exists on promotions';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_promotions_org_active ON public.promotions(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON public.promotions(organization_id, is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_promotions_deleted ON public.promotions(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_products_promo_org ON public.promotions_products(promotion_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_promotions_products_product_org ON public.promotions_products(product_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_promotions_products_org ON public.promotions_products(organization_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_promotions_products_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_promotions_products_unique 
    ON public.promotions_products(promotion_id, product_id, organization_id);
    RAISE NOTICE '✅ created unique index on promotions_products';
  ELSE
    RAISE NOTICE 'ℹ️ unique index already exists on promotions_products';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE '⚠️ unique violation creating idx_promotions_products_unique. Fix duplicates first.';
END
$$;

CREATE INDEX IF NOT EXISTS idx_promotions_carousel_org_position ON public.promotions_carousel(organization_id, position);
CREATE INDEX IF NOT EXISTS idx_promotions_carousel_promotion ON public.promotions_carousel(promotion_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'carousel_audit_log'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_user ON public.carousel_audit_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_created ON public.carousel_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_carousel_audit_action ON public.carousel_audit_log(action, created_at DESC);
    RAISE NOTICE '✅ created indexes on carousel_audit_log';
  ELSE
    RAISE NOTICE 'ℹ️ carousel_audit_log not found, skipping';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.check_carousel_limit()
RETURNS TRIGGER
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.promotions_carousel WHERE organization_id = NEW.organization_id) >= 10 THEN
    RAISE EXCEPTION 'Máximo 10 items permitidos en el carrusel por organización';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_carousel_limit'
  ) THEN
    CREATE TRIGGER enforce_carousel_limit
    BEFORE INSERT ON public.promotions_carousel
    FOR EACH ROW EXECUTE FUNCTION public.check_carousel_limit();
    RAISE NOTICE '✅ created trigger enforce_carousel_limit';
  ELSE
    RAISE NOTICE 'ℹ️ trigger enforce_carousel_limit already exists';
  END IF;
END
$$;

ANALYZE public.promotions;
ANALYZE public.promotions_products;
ANALYZE public.promotions_carousel;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'carousel_audit_log'
  ) THEN
    EXECUTE 'ANALYZE public.carousel_audit_log';
    RAISE NOTICE '✅ analyzed carousel_audit_log';
  END IF;
END
$$;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

SELECT schemaname, relname AS tablename, indexrelname AS indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('promotions', 'promotions_products', 'promotions_carousel', 'carousel_audit_log')
ORDER BY pg_relation_size(indexrelid) DESC;
