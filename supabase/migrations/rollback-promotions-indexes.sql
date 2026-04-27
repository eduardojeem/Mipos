BEGIN;
DROP INDEX IF EXISTS idx_promotions_org_active;
DROP INDEX IF EXISTS idx_promotions_dates;
DROP INDEX IF EXISTS idx_promotions_active_dates;
DROP INDEX IF EXISTS idx_promotions_deleted;
RAISE NOTICE '✅ dropped promotions indexes';

DROP INDEX IF EXISTS idx_promotions_products_promo_org;
DROP INDEX IF EXISTS idx_promotions_products_product_org;
DROP INDEX IF EXISTS idx_promotions_products_org;
DROP INDEX IF EXISTS idx_promotions_products_unique;
RAISE NOTICE '✅ dropped promotions_products indexes';

DROP INDEX IF EXISTS idx_promotions_carousel_org_position;
DROP INDEX IF EXISTS idx_promotions_carousel_promotion;
RAISE NOTICE '✅ dropped promotions_carousel indexes';

DROP INDEX IF EXISTS idx_carousel_audit_user;
DROP INDEX IF EXISTS idx_carousel_audit_created;
DROP INDEX IF EXISTS idx_carousel_audit_action;
RAISE NOTICE '✅ dropped carousel_audit_log indexes';

DROP TRIGGER IF EXISTS enforce_carousel_limit ON public.promotions_carousel;
DROP FUNCTION IF EXISTS public.check_carousel_limit();
RAISE NOTICE '✅ removed carousel limit trigger and function';

COMMIT;

SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('promotions','promotions_products','promotions_carousel','carousel_audit_log')
  AND schemaname='public' AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
