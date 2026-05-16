-- =============================================================================
-- Migration: Returns audit columns + idempotency + anti-double-process guard
-- Date: 2026-05-15
--
-- Context: The audit of /dashboard/returns flagged that the code references
-- processed_at / processed_by but they don't exist in the schema, so the
-- "avg processing time" metric is always zero and you can't tell who
-- approved/processed a return. Also adds:
--   - approved_at / approved_by   (separate from processed)
--   - rejected_at / rejected_by   (separate path)
--   - cashier_id (creator)        (distinct from processed_by → fraud detection)
--   - rejection_reason            (why it was denied)
--   - client_ref UNIQUE           (idempotency from the client side)
--   - ip_address / user_agent     (audit trail)
-- All idempotent — safe to run multiple times.
-- =============================================================================

ALTER TABLE public.returns
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS cashier_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_ref       text,
  ADD COLUMN IF NOT EXISTS ip_address       inet,
  ADD COLUMN IF NOT EXISTS user_agent       text;

-- Idempotency: one client_ref per organization. Two POSTs with the same
-- key (e.g. fast double-click) return the same return row instead of two.
CREATE UNIQUE INDEX IF NOT EXISTS returns_org_client_ref_uidx
  ON public.returns(organization_id, client_ref)
  WHERE client_ref IS NOT NULL;

-- Backfill cashier_id from existing user_id where unset, so old rows have
-- a non-null creator for fraud queries.
UPDATE public.returns
   SET cashier_id = user_id
 WHERE cashier_id IS NULL AND user_id IS NOT NULL;

-- For "returns by cashier in last N days" fraud queries.
CREATE INDEX IF NOT EXISTS returns_cashier_created_idx
  ON public.returns(cashier_id, created_at DESC)
  WHERE cashier_id IS NOT NULL;

-- For "who has processed the most returns" reports.
CREATE INDEX IF NOT EXISTS returns_processed_by_idx
  ON public.returns(processed_by, processed_at DESC)
  WHERE processed_by IS NOT NULL;

COMMENT ON COLUMN public.returns.cashier_id IS
  'User who created the return (distinct from processed_by). Used for fraud detection: same-cashier abuse.';
COMMENT ON COLUMN public.returns.client_ref IS
  'Idempotency key from the client. Prevents duplicate returns from double-clicks / retries.';
COMMENT ON COLUMN public.returns.processed_at IS
  'When the return transitioned APPROVED → COMPLETED. NULL until processing.';
