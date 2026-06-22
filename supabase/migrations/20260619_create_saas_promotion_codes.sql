CREATE TABLE IF NOT EXISTS public.saas_promotion_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  code_prefix TEXT NOT NULL,
  code_suffix TEXT NOT NULL,
  label TEXT NOT NULL,
  target_plan_id UUID NOT NULL REFERENCES public.saas_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  duration_days INTEGER CHECK (duration_days IS NULL OR duration_days > 0),
  duration_months INTEGER CHECK (duration_months IS NULL OR duration_months > 0),
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saas_promotion_codes_valid_window CHECK (
    starts_at IS NULL OR expires_at IS NULL OR starts_at <= expires_at
  )
);

CREATE TABLE IF NOT EXISTS public.saas_promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_code_id UUID NOT NULL REFERENCES public.saas_promotion_codes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.saas_subscriptions(id),
  target_plan_id UUID REFERENCES public.saas_plans(id),
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_promotion_redemptions_code_org
  ON public.saas_promotion_redemptions(promotion_code_id, organization_id)
  WHERE status = 'applied';

CREATE INDEX IF NOT EXISTS idx_saas_promotion_codes_active
  ON public.saas_promotion_codes(is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_saas_promotion_codes_plan
  ON public.saas_promotion_codes(target_plan_id);

CREATE INDEX IF NOT EXISTS idx_saas_promotion_redemptions_org
  ON public.saas_promotion_redemptions(organization_id, redeemed_at DESC);

CREATE OR REPLACE FUNCTION public.update_saas_promotion_codes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_saas_promotion_codes_updated_at
  ON public.saas_promotion_codes;

CREATE TRIGGER trigger_update_saas_promotion_codes_updated_at
  BEFORE UPDATE ON public.saas_promotion_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_saas_promotion_codes_updated_at();

ALTER TABLE public.saas_promotion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_promotion_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage SaaS promotion codes"
  ON public.saas_promotion_codes;
CREATE POLICY "Super admins manage SaaS promotion codes"
  ON public.saas_promotion_codes
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage SaaS promotion redemptions"
  ON public.saas_promotion_redemptions;
CREATE POLICY "Super admins manage SaaS promotion redemptions"
  ON public.saas_promotion_redemptions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_promotion_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_promotion_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_promotion_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saas_promotion_redemptions TO service_role;
