ALTER TABLE public.saas_plans ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;

UPDATE public.saas_plans SET limits = '{
  "maxUsers": 1,
  "maxProducts": 100,
  "maxTransactionsPerMonth": 200,
  "maxLocations": 1,
  "storageGB": 1
}'::jsonb WHERE slug = 'free';

UPDATE public.saas_plans SET limits = '{
  "maxUsers": 5,
  "maxProducts": 1000,
  "maxTransactionsPerMonth": 2000,
  "maxLocations": 1,
  "storageGB": 5
}'::jsonb WHERE slug = 'pro';

UPDATE public.saas_plans SET limits = '{
  "maxUsers": -1,
  "maxProducts": -1,
  "maxTransactionsPerMonth": -1,
  "maxLocations": -1,
  "storageGB": 50
}'::jsonb WHERE slug = 'premium';
