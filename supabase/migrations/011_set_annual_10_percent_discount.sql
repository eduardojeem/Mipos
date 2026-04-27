-- Set yearly price to 12 * monthly * 0.9 for paid plans
UPDATE public.saas_plans SET price_yearly = 0 WHERE slug = 'free';
UPDATE public.saas_plans SET price_yearly = ROUND((price_monthly * 12 * 0.9)::numeric, 2) WHERE slug IN ('pro','premium');
