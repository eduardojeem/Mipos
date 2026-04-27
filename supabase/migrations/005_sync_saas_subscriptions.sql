INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
SELECT o.id, p.id, COALESCE(o.subscription_status, 'active'), 'monthly'
FROM public.organizations o
LEFT JOIN public.saas_plans p ON LOWER(p.slug) = LOWER(COALESCE(o.subscription_plan, 'free'))
LEFT JOIN public.saas_subscriptions s ON s.organization_id = o.id
WHERE s.id IS NULL;

UPDATE public.saas_subscriptions s
SET plan_id = p.id
FROM public.organizations o
JOIN public.saas_plans p ON LOWER(p.slug) = LOWER(COALESCE(o.subscription_plan, 'free'))
WHERE s.organization_id = o.id AND (s.plan_id IS NULL OR s.plan_id <> p.id);

UPDATE public.saas_subscriptions s
SET status = o.subscription_status
FROM public.organizations o
WHERE s.organization_id = o.id AND o.subscription_status IS NOT NULL AND s.status <> o.subscription_status;

UPDATE public.organizations o
SET subscription_plan = p.slug
FROM public.saas_plans p
WHERE LOWER(o.subscription_plan) = LOWER(p.slug) AND o.subscription_plan <> p.slug;
