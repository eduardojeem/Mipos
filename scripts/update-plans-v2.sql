-- Update STARTER plan (Free)
UPDATE public.saas_plans
SET 
  name = 'Starter',
  description = 'Plan inicial para pequeños negocios',
  limits = '{"maxUsers": 2, "maxProducts": 100}'::jsonb,
  features = '["admin_panel", "create_cashier", "create_employee"]'::jsonb
WHERE slug = 'STARTER' OR slug = 'FREE';

-- Update PRO plan
UPDATE public.saas_plans
SET 
  name = 'Professional',
  description = 'Plan profesional para negocios en crecimiento',
  limits = '{"maxUsers": 5, "maxProducts": 1000}'::jsonb,
  features = '["admin_panel", "create_cashier", "create_employee", "create_manager", "reports"]'::jsonb
WHERE slug = 'PRO';

-- Update ENTERPRISE plan
UPDATE public.saas_plans
SET 
  name = 'Enterprise',
  description = 'Plan ilimitado para grandes empresas',
  limits = '{"maxUsers": -1, "maxProducts": -1}'::jsonb,
  features = '["admin_panel", "create_cashier", "create_employee", "create_manager", "create_admin", "reports_advanced", "api_access"]'::jsonb
WHERE slug = 'ENTERPRISE';
