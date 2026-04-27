-- Add optional RUC column to customers table
-- Safe to run multiple times
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS ruc TEXT;

-- Optional: simple index for lookup/search by RUC
CREATE INDEX IF NOT EXISTS idx_customers_ruc ON public.customers (ruc);

