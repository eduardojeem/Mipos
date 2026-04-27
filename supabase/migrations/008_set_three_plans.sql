INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features, is_active, created_at, updated_at)
VALUES
  ('Free', 'free', 0, 0, '["1 usuario","100 productos","Ventas ilimitadas","Soporte por email"]'::jsonb, true, now(), now()),
  ('Pro', 'pro', 49, 588, '["Usuarios ilimitados","Locales ilimitados","Productos ilimitados","Reportes avanzados","Soporte prioritario"]'::jsonb, true, now(), now()),
  ('Premium', 'premium', 99, 1188, '["Todo en Pro","Integraciones avanzadas","SLA de soporte","Funciones enterprise"]'::jsonb, true, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = now();

UPDATE public.saas_plans SET is_active = false WHERE slug NOT IN ('free','pro','premium');

UPDATE public.organizations SET subscription_plan = CASE
  WHEN LOWER(subscription_plan) IN ('free','pro','premium') THEN LOWER(subscription_plan)
  ELSE 'pro'
END;

UPDATE public.saas_subscriptions s
SET plan_id = p.id
FROM public.organizations o
JOIN public.saas_plans p ON LOWER(p.slug) = LOWER(COALESCE(o.subscription_plan, 'free'))
WHERE s.organization_id = o.id AND (s.plan_id IS DISTINCT FROM p.id OR s.plan_id IS NULL);
