BEGIN;

ALTER TABLE public.pos_invoices
  ADD COLUMN IF NOT EXISTS sale_id text,
  ADD COLUMN IF NOT EXISTS sale_number text;

CREATE INDEX IF NOT EXISTS pos_invoices_org_sale_id_idx
  ON public.pos_invoices (organization_id, sale_id)
  WHERE sale_id IS NOT NULL;

COMMIT;
