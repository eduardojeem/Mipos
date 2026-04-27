-- Actualiza precios de suscripciones (PYG) y agrega validaciones.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saas_plans_price_monthly_non_negative'
  ) THEN
    ALTER TABLE public.saas_plans
      ADD CONSTRAINT saas_plans_price_monthly_non_negative
      CHECK (price_monthly >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saas_plans_price_yearly_non_negative'
  ) THEN
    ALTER TABLE public.saas_plans
      ADD CONSTRAINT saas_plans_price_yearly_non_negative
      CHECK (price_yearly >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saas_plans_price_yearly_not_exceed_12_months'
  ) THEN
    ALTER TABLE public.saas_plans
      ADD CONSTRAINT saas_plans_price_yearly_not_exceed_12_months
      CHECK (price_yearly <= (price_monthly * 12));
  END IF;

END $$;

-- Descuento anual: 10% sobre 12 meses.
-- Starter: 100.000 x 12 = 1.200.000 => 1.080.000
-- Professional: 200.000 x 12 = 2.400.000 => 2.160.000

UPDATE public.saas_plans
SET
  price_monthly = 0,
  price_yearly = 0,
  updated_at = NOW()
WHERE slug = 'free';

UPDATE public.saas_plans
SET
  price_monthly = 100000,
  price_yearly = 1080000,
  updated_at = NOW()
WHERE slug = 'starter';

UPDATE public.saas_plans
SET
  price_monthly = 200000,
  price_yearly = 2160000,
  updated_at = NOW()
WHERE slug = 'professional';
