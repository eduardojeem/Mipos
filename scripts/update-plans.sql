-- Update FREE plan to STARTER (or just update properties if we keep slug FREE)
-- Let's rename slug to STARTER to be precise, but that might break code relying on 'FREE'.
-- Safer to keep slug 'FREE' and change name to 'Starter', OR create new STARTER and migrate.
-- Given the request "revisame los planes actuales... que el plan starter...", I'll update the existing 'FREE' plan to be 'Starter'.

UPDATE public.saas_plans
SET 
  name = 'Starter',
  description = 'Plan inicial para pequeños negocios',
  limits = '{"maxUsers": 2, "maxProducts": 100}'::jsonb,
  features = '["admin_panel", "create_seller"]'::jsonb
WHERE slug = 'FREE';

-- Update PRO plan
UPDATE public.saas_plans
SET 
  name = 'Professional',
  description = 'Plan profesional para negocios en crecimiento',
  limits = '{"maxUsers": 5, "maxProducts": 1000}'::jsonb,
  features = '["admin_panel", "create_seller", "create_manager", "reports"]'::jsonb
WHERE slug = 'PRO';

-- Update ENTERPRISE plan
UPDATE public.saas_plans
SET 
  name = 'Enterprise',
  description = 'Plan ilimitado para grandes empresas',
  limits = '{"maxUsers": -1, "maxProducts": -1}'::jsonb,
  features = '["admin_panel", "create_seller", "create_manager", "reports_advanced", "api_access"]'::jsonb
WHERE slug = 'ENTERPRISE';
