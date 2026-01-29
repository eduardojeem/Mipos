-- Create SaaS Plans table
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- basic, premium, enterprise
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SaaS Subscriptions table
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.saas_plans(id),
    status TEXT DEFAULT 'active', -- active, cancelled, past_due, trialing
    billing_cycle TEXT DEFAULT 'monthly', -- monthly, yearly
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id) -- One active subscription per org
);

-- Insert default plans
INSERT INTO public.saas_plans (name, slug, price_monthly, price_yearly, features)
VALUES 
('Básico', 'basic', 49.00, 490.00, '["Up to 5 users", "Basic reports"]'::jsonb),
('Premium', 'premium', 199.00, 1990.00, '["Up to 20 users", "Advanced reports", "API Access"]'::jsonb),
('Enterprise', 'enterprise', 499.00, 4990.00, '["Unlimited users", "Custom solutions", "Dedicated support"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for saas_plans
DROP POLICY IF EXISTS "Public read plans" ON public.saas_plans;
CREATE POLICY "Public read plans" ON public.saas_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin manage plans" ON public.saas_plans;
CREATE POLICY "Super admin manage plans" ON public.saas_plans USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
);

-- Policies for saas_subscriptions
DROP POLICY IF EXISTS "Super admin view all subs" ON public.saas_subscriptions;
CREATE POLICY "Super admin view all subs" ON public.saas_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
);

DROP POLICY IF EXISTS "Org members view own sub" ON public.saas_subscriptions;
CREATE POLICY "Org members view own sub" ON public.saas_subscriptions FOR SELECT USING (
  organization_id IN (SELECT unnest(get_my_org_ids()))
);
