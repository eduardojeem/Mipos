DO $$
DECLARE org_id UUID; plan_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'john-espinoza-org';
  SELECT id INTO plan_id FROM public.saas_plans WHERE slug = 'premium';
  IF org_id IS NOT NULL AND plan_id IS NOT NULL THEN
    INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
    VALUES (org_id, plan_id, 'active', 'monthly', now(), now() + interval '30 days')
    ON CONFLICT (organization_id)
    DO UPDATE SET plan_id = EXCLUDED.plan_id,
                  status = 'active',
                  billing_cycle = 'monthly',
                  current_period_start = EXCLUDED.current_period_start,
                  current_period_end = EXCLUDED.current_period_end;
  END IF;
END $$;

