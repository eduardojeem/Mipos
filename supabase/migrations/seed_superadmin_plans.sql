-- Seed de datos de ejemplo para la sección SuperAdmin/Plans
-- Inserta/actualiza planes en public.saas_plans usando slug como clave única

-- FREE
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES (
  'Free', 'free', 0, 0,
  '[
    "Hasta 5 usuarios",
    "1 local",
    "100 productos",
    "Reportes básicos",
    "Soporte por email"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- STARTER ($15)
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES (
  'Starter', 'starter', 15, 180,
  '[
    "Hasta 15 usuarios",
    "3 locales",
    "1.000 productos",
    "Reportes intermedios",
    "Soporte estándar"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- PROFESSIONAL ($30)
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES (
  'Professional', 'professional', 30, 360,
  '[
    "Usuarios ilimitados",
    "Locales ilimitados",
    "Productos ilimitados",
    "Reportes avanzados",
    "Soporte prioritario"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- PREMIUM ($49)
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES (
  'Premium', 'premium', 49, 588,
  '[
    "Usuarios ilimitados",
    "Soporte 24/7",
    "Automatizaciones",
    "Reportes personalizados",
    "Integraciones avanzadas"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ENTERPRISE ($99)
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active)
VALUES (
  'Enterprise', 'enterprise', 99, 1188,
  '[
    "SLA empresarial",
    "Onboarding dedicado",
    "Soporte técnico premium",
    "Reportes a medida",
    "Integraciones a la carta"
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

