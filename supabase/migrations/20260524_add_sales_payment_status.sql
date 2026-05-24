ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'PENDING';

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS sales_payment_status_check;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));

CREATE INDEX IF NOT EXISTS idx_sales_org_payment_status
  ON public.sales (organization_id, payment_status);
