-- Normalize SaaS subscription plans to the canonical application contract.
-- Features must be machine keys; human labels are rendered by the UI.

INSERT INTO public.saas_plans (
  name,
  slug,
  price_monthly,
  price_yearly,
  features,
  limits,
  max_users,
  max_products,
  max_transactions_per_month,
  max_locations,
  currency,
  trial_days,
  is_active,
  updated_at
)
VALUES
  (
    'Free',
    'free',
    0,
    0,
    '["basic_inventory","basic_sales","public_catalog","services_catalog","admin_panel"]'::jsonb,
    '{"maxUsers":1,"maxProducts":50,"maxTransactionsPerMonth":200,"maxLocations":1,"maxServices":5,"maxAppointmentsPerMonth":0,"maxStaff":0}'::jsonb,
    1,
    50,
    200,
    1,
    'PYG',
    0,
    true,
    NOW()
  ),
  (
    'Starter',
    'starter',
    100000,
    1080000,
    '["basic_inventory","basic_sales","public_catalog","online_orders","marketplace_public","services_catalog","appointments","staff_management","public_booking","purchase_module","basic_reports","team_management","admin_panel","advanced_inventory","multi_branch"]'::jsonb,
    '{"maxUsers":5,"maxProducts":500,"maxTransactionsPerMonth":1000,"maxLocations":3,"maxServices":25,"maxAppointmentsPerMonth":200,"maxStaff":5}'::jsonb,
    5,
    500,
    1000,
    3,
    'PYG',
    0,
    true,
    NOW()
  ),
  (
    'Professional',
    'professional',
    200000,
    2160000,
    '["basic_inventory","basic_sales","public_catalog","online_orders","marketplace_public","services_catalog","appointments","staff_management","public_booking","purchase_module","basic_reports","advanced_reports","multi_branch","audit_logs","export_reports","team_management","admin_panel","advanced_inventory","loyalty_program","custom_branding"]'::jsonb,
    '{"maxUsers":20,"maxProducts":5000,"maxTransactionsPerMonth":10000,"maxLocations":10,"maxServices":200,"maxAppointmentsPerMonth":2000,"maxStaff":20}'::jsonb,
    20,
    5000,
    10000,
    10,
    'PYG',
    0,
    true,
    NOW()
  ),
  (
    'Enterprise',
    'enterprise',
    0,
    0,
    '["basic_inventory","basic_sales","public_catalog","online_orders","marketplace_public","services_catalog","appointments","staff_management","public_booking","purchase_module","basic_reports","advanced_reports","multi_branch","audit_logs","unlimited_users","unlimited_products","export_reports","team_management","admin_panel","advanced_inventory","api_access","loyalty_program","custom_branding"]'::jsonb,
    '{"maxUsers":-1,"maxProducts":-1,"maxTransactionsPerMonth":-1,"maxLocations":-1,"maxServices":-1,"maxAppointmentsPerMonth":-1,"maxStaff":-1}'::jsonb,
    -1,
    -1,
    -1,
    -1,
    'PYG',
    0,
    false,
    NOW()
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  max_users = EXCLUDED.max_users,
  max_products = EXCLUDED.max_products,
  max_transactions_per_month = EXCLUDED.max_transactions_per_month,
  max_locations = EXCLUDED.max_locations,
  currency = EXCLUDED.currency,
  trial_days = EXCLUDED.trial_days,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

UPDATE public.organizations
SET
  subscription_plan = CASE UPPER(COALESCE(subscription_plan, ''))
    WHEN 'BASIC' THEN 'STARTER'
    WHEN 'STARTER' THEN 'STARTER'
    WHEN 'PRO' THEN 'PROFESSIONAL'
    WHEN 'PREMIUM' THEN 'PROFESSIONAL'
    WHEN 'PROFESSIONAL' THEN 'PROFESSIONAL'
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE'
    ELSE 'FREE'
  END,
  updated_at = NOW()
WHERE UPPER(COALESCE(subscription_plan, '')) NOT IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE')
   OR subscription_plan IS NULL
   OR subscription_plan <> UPPER(subscription_plan);

WITH canonical AS (
  SELECT slug, id
  FROM public.saas_plans
  WHERE slug IN ('free', 'starter', 'professional', 'enterprise')
),
legacy AS (
  SELECT id, slug
  FROM public.saas_plans
  WHERE slug IN ('basic', 'pro', 'premium')
)
UPDATE public.saas_subscriptions subscription
SET
  plan_id = canonical.id,
  updated_at = NOW()
FROM legacy
JOIN canonical ON canonical.slug = CASE
  WHEN legacy.slug = 'basic' THEN 'starter'
  ELSE 'professional'
END
WHERE subscription.plan_id = legacy.id;

UPDATE public.saas_plans
SET
  is_active = false,
  updated_at = NOW()
WHERE slug IN ('basic', 'pro', 'premium');

CREATE OR REPLACE FUNCTION public.normalize_company_plan(raw_plan TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE UPPER(COALESCE(raw_plan, ''))
    WHEN 'BASIC' THEN 'STARTER'
    WHEN 'STARTER' THEN 'STARTER'
    WHEN 'PRO' THEN 'PROFESSIONAL'
    WHEN 'PREMIUM' THEN 'PROFESSIONAL'
    WHEN 'PROFESSIONAL' THEN 'PROFESSIONAL'
    WHEN 'ENTERPRISE' THEN 'ENTERPRISE'
    ELSE 'FREE'
  END
$$;
