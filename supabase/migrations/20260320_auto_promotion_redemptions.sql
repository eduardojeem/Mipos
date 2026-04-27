-- Auto redemptions on sale_items insert
-- Safe search_path and row-level checks via organization_id from sales

-- Ensure unique constraint to avoid duplicate redemptions per sale/promo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_promotion_redemptions_unique_promo_sale'
  ) THEN
    CREATE UNIQUE INDEX idx_promotion_redemptions_unique_promo_sale
      ON public.promotion_redemptions(promotion_id, sale_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_track_promotion_redemption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_sale text := NEW.sale_id;
  v_prod text := NEW.product_id;
  v_unit numeric := COALESCE(NEW.unit_price, 0);
  v_promo record;
  v_discount numeric;
BEGIN
  -- Derive organization from parent sale
  SELECT organization_id INTO v_org FROM public.sales WHERE id = v_sale;
  IF v_org IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iterate applicable active promotions for this product and organization at sale time
  FOR v_promo IN
    SELECT p.id, p.discount_type, p.discount_value
    FROM public.promotions p
    JOIN public.promotions_products pp ON pp.promotion_id = p.id AND pp.product_id = v_prod AND pp.organization_id = p.organization_id
    WHERE p.organization_id = v_org
      AND COALESCE(p.is_active, TRUE) = TRUE
      AND now() BETWEEN p.start_date AND p.end_date
  LOOP
    -- Compute discount amount
    IF upper(COALESCE(v_promo.discount_type::text, '')) = 'PERCENTAGE' THEN
      v_discount := round((v_unit * COALESCE(v_promo.discount_value, 0))::numeric / 100.0);
    ELSE
      v_discount := COALESCE(v_promo.discount_value, 0);
    END IF;
    IF v_discount IS NULL OR v_discount < 0 THEN v_discount := 0; END IF;

    -- Insert redemption if not exists
    INSERT INTO public.promotion_redemptions(promotion_id, sale_id, organization_id, discount_amount)
    VALUES (v_promo.id, v_sale, v_org, v_discount)
    ON CONFLICT (promotion_id, sale_id) DO NOTHING;

    -- Increment usage counter (best-effort)
    UPDATE public.promotions SET usage_count = COALESCE(usage_count,0) + 1, updated_at = now()
    WHERE id = v_promo.id;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on sale_items insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sale_items_track_promo'
  ) THEN
    CREATE TRIGGER trg_sale_items_track_promo
      AFTER INSERT ON public.sale_items
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_track_promotion_redemption();
  END IF;
END $$;

