-- Create a lightweight redemptions ledger for promotions performance in dashboard
CREATE TABLE IF NOT EXISTS public.promotion_redemptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  promotion_id TEXT NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  organization_id UUID,
  discount_amount NUMERIC(12,2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add organization_id if table exists in multitenant mode (best-effort)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='promotion_redemptions' AND column_name='organization_id'
  ) THEN
    ALTER TABLE public.promotion_redemptions ADD COLUMN organization_id UUID;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promo ON public.promotion_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_sale ON public.promotion_redemptions(sale_id);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_org ON public.promotion_redemptions(organization_id);

-- RLS
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotion_redemptions' AND policyname='promotion_redemptions_select'
  ) THEN
    CREATE POLICY promotion_redemptions_select ON public.promotion_redemptions
      FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='promotion_redemptions' AND policyname='promotion_redemptions_insert'
  ) THEN
    CREATE POLICY promotion_redemptions_insert ON public.promotion_redemptions
      FOR INSERT WITH CHECK (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
      );
  END IF;
END $$;

-- Seed redemptions for Paravos promotions to drive dashboard metrics
DO $$
DECLARE
  org UUID;
  promo_frag TEXT; promo_acce TEXT;
  s TEXT;
  cnt INT := 0;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  SELECT id INTO promo_frag FROM public.promotions WHERE name='Fragancias 15%' AND (organization_id = org OR organization_id IS NULL) LIMIT 1;
  SELECT id INTO promo_acce FROM public.promotions WHERE name='Outlet Accesorios 25%' AND (organization_id = org OR organization_id IS NULL) LIMIT 1;

  -- Take last 6 sales and attribute alternately to promotions
  FOR s IN (
    SELECT id FROM public.sales
    WHERE (organization_id = org OR organization_id IS NULL)
    ORDER BY created_at DESC NULLS LAST
    LIMIT 6
  ) LOOP
    cnt := cnt + 1;
    IF (cnt % 2 = 1) AND promo_frag IS NOT NULL THEN
      INSERT INTO public.promotion_redemptions(promotion_id, sale_id, organization_id, discount_amount)
      VALUES (promo_frag, s, org, 15000)
      ON CONFLICT DO NOTHING;
      UPDATE public.promotions SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = promo_frag;
    ELSIF promo_acce IS NOT NULL THEN
      INSERT INTO public.promotion_redemptions(promotion_id, sale_id, organization_id, discount_amount)
      VALUES (promo_acce, s, org, 25000)
      ON CONFLICT DO NOTHING;
      UPDATE public.promotions SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = promo_acce;
    END IF;
  END LOOP;
END $$;

