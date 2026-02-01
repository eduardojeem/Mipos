-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_plan TEXT DEFAULT 'FREE',
  subscription_status TEXT DEFAULT 'ACTIVE',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id TEXT, -- Can be UUID or String depending on role system
  role TEXT, -- Denormalized role name
  is_owner BOOLEAN DEFAULT FALSE,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Create saas_plans table
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10, 2) DEFAULT 0,
  price_yearly NUMERIC(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans if not exist
INSERT INTO public.saas_plans (name, slug, description, price_monthly, limits)
VALUES 
('Free Plan', 'FREE', 'Basic plan for small businesses', 0, '{"maxUsers": 1, "maxProducts": 50}'),
('Pro Plan', 'PRO', 'Professional plan for growing businesses', 29.99, '{"maxUsers": 5, "maxProducts": 500}'),
('Enterprise Plan', 'ENTERPRISE', 'Unlimited plan for large organizations', 99.99, '{"maxUsers": -1, "maxProducts": -1}')
ON CONFLICT (slug) DO NOTHING;
