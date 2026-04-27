-- Asegura que el plan FREE pueda acceder al panel de administración (Settings).

UPDATE public.saas_plans
SET
  features = CASE
    WHEN COALESCE(features, '[]'::jsonb) @> '["admin_panel"]'::jsonb THEN COALESCE(features, '[]'::jsonb)
    ELSE COALESCE(features, '[]'::jsonb) || '["admin_panel"]'::jsonb
  END,
  updated_at = NOW()
WHERE slug = 'free';

INSERT INTO public.saas_plan_features (plan_id, feature_id, is_enabled)
SELECT p.id, f.id, TRUE
FROM public.saas_plans p
JOIN public.plan_features f ON f.key = 'admin_panel'
WHERE p.slug = 'free'
ON CONFLICT (plan_id, feature_id) DO UPDATE
SET is_enabled = TRUE, updated_at = NOW();

CREATE OR REPLACE FUNCTION public.company_plan_has_feature(company_uuid UUID, feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH company_plan AS (
    SELECT public.normalize_company_plan(o.subscription_plan) AS plan_name
    FROM public.organizations o
    WHERE o.id = company_uuid
  )
  SELECT EXISTS (
    SELECT 1
    FROM company_plan cp
    WHERE (
      cp.plan_name = 'FREE'
      AND feature_key IN ('basic_inventory', 'basic_sales', 'admin_panel')
    ) OR (
      cp.plan_name = 'STARTER'
      AND feature_key IN ('basic_inventory', 'basic_sales', 'purchase_module', 'basic_reports', 'team_management', 'admin_panel', 'advanced_inventory')
    ) OR (
      cp.plan_name IN ('PROFESSIONAL', 'PREMIUM', 'ENTERPRISE')
      AND feature_key IN (
        'basic_inventory',
        'basic_sales',
        'purchase_module',
        'basic_reports',
        'advanced_reports',
        'multi_branch',
        'audit_logs',
        'unlimited_users',
        'export_reports',
        'team_management',
        'admin_panel',
        'advanced_inventory',
        'api_access',
        'loyalty_program',
        'unlimited_products',
        'custom_branding'
      )
    )
  )
$$;

GRANT EXECUTE ON FUNCTION public.company_plan_has_feature(UUID, TEXT) TO authenticated, service_role;
