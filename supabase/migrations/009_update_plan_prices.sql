UPDATE public.saas_plans SET price_monthly = 0,  price_yearly = 0   WHERE slug = 'free';
UPDATE public.saas_plans SET price_monthly = 15, price_yearly = 180 WHERE slug = 'pro';
UPDATE public.saas_plans SET price_monthly = 30, price_yearly = 360 WHERE slug = 'premium';
