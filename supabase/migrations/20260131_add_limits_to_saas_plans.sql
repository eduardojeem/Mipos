
ALTER TABLE public.saas_plans 
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{"maxUsers": 5, "maxProducts": 100, "maxTransactionsPerMonth": 1000, "maxLocations": 1}'::jsonb;

ALTER TABLE public.saas_plans
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.saas_plans
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

ALTER TABLE public.saas_plans
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
