DO $$
DECLARE
  professional_plan_id UUID;
  starter_plan_id UUID;
BEGIN
  ALTER TABLE public.plan_subscriptions
  DROP CONSTRAINT IF EXISTS plan_subscriptions_plan_type_check;

  ALTER TABLE public.plan_subscriptions
  ADD CONSTRAINT plan_subscriptions_plan_type_check
  CHECK (plan_type IN ('free', 'starter', 'professional')) NOT VALID;

  UPDATE public.saas_plans
  SET
    name = CASE
      WHEN slug = 'free' THEN 'Free'
      WHEN slug = 'starter' THEN 'Starter'
      WHEN slug = 'professional' THEN 'Professional'
      ELSE name
    END,
    is_active = CASE
      WHEN slug IN ('free', 'starter', 'professional') THEN TRUE
      WHEN slug IN ('basic', 'pro', 'premium', 'enterprise') THEN FALSE
      ELSE is_active
    END,
    updated_at = NOW()
  WHERE slug IN ('free', 'starter', 'professional', 'basic', 'pro', 'premium', 'enterprise');

  UPDATE public.organizations
  SET
    subscription_plan = CASE UPPER(COALESCE(subscription_plan, 'FREE'))
      WHEN 'BASIC' THEN 'STARTER'
      WHEN 'STARTER' THEN 'STARTER'
      WHEN 'PRO' THEN 'PROFESSIONAL'
      WHEN 'PREMIUM' THEN 'PROFESSIONAL'
      WHEN 'ENTERPRISE' THEN 'PROFESSIONAL'
      WHEN 'PROFESSIONAL' THEN 'PROFESSIONAL'
      ELSE 'FREE'
    END,
    updated_at = NOW()
  WHERE UPPER(COALESCE(subscription_plan, 'FREE')) IN ('BASIC', 'STARTER', 'PRO', 'PREMIUM', 'ENTERPRISE', 'PROFESSIONAL', 'FREE');

  UPDATE public.plan_subscriptions
  SET plan_type = CASE LOWER(COALESCE(plan_type, 'free'))
    WHEN 'basic' THEN 'starter'
    WHEN 'pro' THEN 'professional'
    WHEN 'premium' THEN 'professional'
    WHEN 'enterprise' THEN 'professional'
    ELSE LOWER(COALESCE(plan_type, 'free'))
  END
  WHERE LOWER(COALESCE(plan_type, 'free')) IN ('basic', 'starter', 'pro', 'premium', 'enterprise', 'professional', 'free');

  SELECT id INTO professional_plan_id
  FROM public.saas_plans
  WHERE slug = 'professional'
  LIMIT 1;

  SELECT id INTO starter_plan_id
  FROM public.saas_plans
  WHERE slug = 'starter'
  LIMIT 1;

  IF professional_plan_id IS NOT NULL THEN
    UPDATE public.saas_subscriptions
    SET plan_id = professional_plan_id
    WHERE plan_id IN (
      SELECT id FROM public.saas_plans WHERE slug IN ('pro', 'premium', 'enterprise')
    );
  END IF;

  IF starter_plan_id IS NOT NULL THEN
    UPDATE public.saas_subscriptions
    SET plan_id = starter_plan_id
    WHERE plan_id IN (
      SELECT id FROM public.saas_plans WHERE slug = 'basic'
    );
  END IF;

  ALTER TABLE public.plan_subscriptions
  VALIDATE CONSTRAINT plan_subscriptions_plan_type_check;
END $$;
