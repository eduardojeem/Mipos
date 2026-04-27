BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_invoices (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  organization_id uuid NOT NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'USD',
  issued_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  due_date date,
  customer_id text,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  customer_tax_id text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pos_invoices_status_check'
  ) THEN
    ALTER TABLE public.pos_invoices
    ADD CONSTRAINT pos_invoices_status_check
    CHECK (status IN ('draft','issued','paid','void','overdue'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pos_invoices_org_invoice_number_uidx
  ON public.pos_invoices (organization_id, invoice_number);

CREATE INDEX IF NOT EXISTS pos_invoices_org_issued_date_idx
  ON public.pos_invoices (organization_id, issued_date DESC, created_at DESC);

ALTER TABLE public.pos_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_invoices_read" ON public.pos_invoices;
CREATE POLICY "pos_invoices_read" ON public.pos_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = pos_invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "pos_invoices_write" ON public.pos_invoices;
CREATE POLICY "pos_invoices_write" ON public.pos_invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      LEFT JOIN public.roles r ON r.id = om.role_id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = pos_invoices.organization_id
        AND (om.is_owner = true OR r.name IN ('MANAGER','ADMIN','SUPER_ADMIN'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      LEFT JOIN public.roles r ON r.id = om.role_id
      WHERE om.user_id = auth.uid()
        AND om.organization_id = pos_invoices.organization_id
        AND (om.is_owner = true OR r.name IN ('MANAGER','ADMIN','SUPER_ADMIN'))
    )
  );

GRANT SELECT ON public.pos_invoices TO anon;
GRANT ALL PRIVILEGES ON public.pos_invoices TO authenticated;

COMMIT;
