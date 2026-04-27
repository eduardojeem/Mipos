-- Sync legacy public.plans into public.saas_plans, then drop legacy table

INSERT INTO public.saas_plans (
  name,
  slug,
  price_monthly,
  price_yearly,
  features,
  is_active,
  created_at,
  updated_at
)
SELECT
  COALESCE(p.display_name, p.name) AS name,
  LOWER(REGEXP_REPLACE(COALESCE(p.display_name, p.name), '\\s+', '-', 'g')) AS slug,
  COALESCE(
    CASE WHEN p.interval = 'monthly' THEN p.price ELSE p.price / 12 END,
    0
  ) AS price_monthly,
  COALESCE(
    CASE WHEN p.interval = 'yearly' THEN p.price ELSE p.price * 12 END,
    0
  ) AS price_yearly,
  COALESCE(p.features, '[]'::jsonb) AS features,
  COALESCE(p.is_active, true) AS is_active,
  p.created_at,
  p.updated_at
FROM public.plans p
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = COALESCE(EXCLUDED.price_monthly, public.saas_plans.price_monthly),
  price_yearly = COALESCE(EXCLUDED.price_yearly, public.saas_plans.price_yearly),
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Drop legacy table to avoid confusion
DROP TABLE IF EXISTS public.plans CASCADE;
