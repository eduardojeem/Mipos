-- Upsert default SaaS plans into public.saas_plans
-- This migration is idempotent: it updates existing rows matching slug

INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES ('Free', 'free', 0, 0, '["Hasta 5 usuarios","1 local","100 productos"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES ('Starter', 'starter', 15, 180, '["Hasta 15 usuarios","3 locales","1.000 productos"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES ('Professional', 'professional', 30, 360, '["Usuarios ilimitados","Locales ilimitados","Productos ilimitados"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES ('Premium', 'premium', 49, 588, '["Usuarios ilimitados","Soporte prioritario","Reportes avanzados"]'::jsonb, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

