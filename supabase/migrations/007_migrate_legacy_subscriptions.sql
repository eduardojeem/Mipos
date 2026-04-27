-- Migrate legacy public.subscriptions to public.saas_subscriptions
-- and update invoices to reference the new subscriptions

-- 1) Upsert into saas_subscriptions based on organizations.subscription_plan
INSERT INTO public.saas_subscriptions (
  organization_id,
  plan_id,
  status,
  billing_cycle,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
SELECT
  s.organization_id,
  p.id AS plan_id,
  COALESCE(s.status, 'active') AS status,
  'monthly' AS billing_cycle,
  s.current_period_start,
  s.current_period_end,
  COALESCE(s.cancel_at_period_end, false) AS cancel_at_period_end,
  COALESCE(s.created_at, now()),
  COALESCE(s.updated_at, now())
FROM public.subscriptions s
JOIN public.organizations o ON o.id = s.organization_id
LEFT JOIN public.saas_plans p ON LOWER(p.slug) = LOWER(COALESCE(o.subscription_plan, 'free'))
ON CONFLICT (organization_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  billing_cycle = EXCLUDED.billing_cycle,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  cancel_at_period_end = EXCLUDED.cancel_at_period_end,
  updated_at = now();

-- 2) Update invoices.subscription_id to the new saas_subscriptions id per organization
-- Drop legacy FK first
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;

UPDATE public.invoices i
SET subscription_id = s.id
FROM public.saas_subscriptions s
WHERE s.organization_id = i.organization_id;

-- Recreate FK pointing to saas_subscriptions
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_subscription_id_fkey
  FOREIGN KEY (subscription_id)
  REFERENCES public.saas_subscriptions(id);

-- 3) Drop legacy subscriptions table to avoid confusion
DROP TABLE IF EXISTS public.subscriptions CASCADE;
