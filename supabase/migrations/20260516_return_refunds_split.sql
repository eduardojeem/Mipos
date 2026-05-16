-- Multi-method (split) refunds for returns
-- A return may be reimbursed via multiple methods (e.g. CASH + CARD).
-- The legacy `returns.refund_method` column is kept for back-compat:
--   * If a single line exists, it mirrors that method.
--   * If multiple lines exist, it stores 'MIXED'.

CREATE TABLE IF NOT EXISTS public.return_refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id       text NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  organization_id text NOT NULL,
  method          text NOT NULL CHECK (method IN ('CASH','CARD','TRANSFER','OTHER')),
  amount          numeric(18,2) NOT NULL CHECK (amount > 0),
  reference       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      text
);

CREATE INDEX IF NOT EXISTS return_refunds_return_idx
  ON public.return_refunds (return_id);

CREATE INDEX IF NOT EXISTS return_refunds_org_method_idx
  ON public.return_refunds (organization_id, method);

-- Backfill from existing single-method returns so historical reads stay consistent.
INSERT INTO public.return_refunds (return_id, organization_id, method, amount, created_at)
SELECT r.id,
       r."organizationId",
       COALESCE(NULLIF(upper(r."refundMethod"::text), ''), 'CASH'),
       r."totalAmount",
       COALESCE(r."processedAt", r."createdAt")
FROM public.returns r
LEFT JOIN public.return_refunds rr ON rr.return_id = r.id
WHERE rr.id IS NULL
  AND r."totalAmount" > 0;

-- RLS
ALTER TABLE public.return_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS return_refunds_select ON public.return_refunds;
CREATE POLICY return_refunds_select ON public.return_refunds
  FOR SELECT USING (
    organization_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'organization_id', '')
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS return_refunds_insert ON public.return_refunds;
CREATE POLICY return_refunds_insert ON public.return_refunds
  FOR INSERT WITH CHECK (
    organization_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'organization_id', '')
    OR public.is_super_admin()
  );

COMMENT ON TABLE public.return_refunds IS
  'Split refund lines per return (CASH+CARD+...). Sum equals returns.total_amount.';
