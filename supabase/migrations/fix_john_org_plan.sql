UPDATE public.organizations
SET subscription_plan = 'PREMIUM', subscription_status = 'ACTIVE', updated_at = now()
WHERE slug = 'john-espinoza-org';

