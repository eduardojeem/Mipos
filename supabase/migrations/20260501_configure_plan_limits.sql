-- =====================================================
-- Configurar límites reales de planes SaaS
-- FREE: 50 productos, 1 usuario, 1 sucursal, sin multiusuario
-- STARTER: 500 productos, 5 usuarios, 3 sucursales
-- =====================================================

-- 1. Agregar columnas de límites si no existen
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS max_users INTEGER;
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS max_products INTEGER;
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS max_transactions_per_month INTEGER;
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS max_locations INTEGER;
ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;

-- 2. Configurar plan FREE
UPDATE public.saas_plans
SET
  max_users = 1,
  max_products = 50,
  max_transactions_per_month = 100,
  max_locations = 1,
  features = '["pos", "basic_inventory", "basic_reports"]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('free', 'FREE', 'Free');

-- Si no existe el plan free, crearlo
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, max_locations, features, is_active)
SELECT 'Free', 'free', 0, 0, 1, 50, 100, 1, '["pos", "basic_inventory", "basic_reports"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE slug IN ('free', 'FREE', 'Free'));

-- 3. Configurar plan STARTER
UPDATE public.saas_plans
SET
  max_users = 5,
  max_products = 500,
  max_transactions_per_month = 1000,
  max_locations = 3,
  features = '["pos", "basic_inventory", "basic_reports", "team_management", "admin_panel", "analytics", "multiple_branches"]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('starter', 'STARTER', 'Starter', 'basic', 'BASIC', 'Basic');

-- Si no existe el plan starter, crearlo
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, max_users, max_products, max_transactions_per_month, max_locations, features, is_active)
SELECT 'Starter', 'starter', 29900, 299000, 5, 500, 1000, 3, '["pos", "basic_inventory", "basic_reports", "team_management", "admin_panel", "analytics", "multiple_branches"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.saas_plans WHERE slug IN ('starter', 'STARTER', 'Starter', 'basic', 'BASIC', 'Basic'));

-- 4. Configurar plan PRO (si existe)
UPDATE public.saas_plans
SET
  max_users = 20,
  max_products = 5000,
  max_transactions_per_month = 10000,
  max_locations = 10,
  features = '["pos", "basic_inventory", "basic_reports", "team_management", "admin_panel", "analytics", "multiple_branches", "unlimited_users", "advanced_reports", "api_access", "custom_branding"]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('pro', 'PRO', 'Pro', 'premium', 'PREMIUM', 'Premium');

-- 5. Configurar plan ENTERPRISE (si existe)
UPDATE public.saas_plans
SET
  max_users = 999999,
  max_products = 999999,
  max_transactions_per_month = 999999,
  max_locations = 999999,
  features = '["pos", "basic_inventory", "basic_reports", "team_management", "admin_panel", "analytics", "multiple_branches", "unlimited_users", "unlimited_products", "advanced_reports", "api_access", "custom_branding", "priority_support", "custom_domain"]'::jsonb,
  updated_at = NOW()
WHERE slug IN ('enterprise', 'ENTERPRISE', 'Enterprise');

-- 6. Verificar resultado
SELECT slug, name, max_users, max_products, max_transactions_per_month, max_locations, price_monthly, is_active
FROM public.saas_plans
ORDER BY price_monthly ASC;
