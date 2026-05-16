-- =============================================================================
-- Migration: Create sale_feedback table for CSAT post-sale surveys
-- Date: 2026-05-15
--
-- Context: The Venta Exitosa modal includes a 1-5 evaluation prompt
-- ("¿Cómo fue tu experiencia?"). Until now the score was only saved to
-- localStorage on the cashier's device — invisible to the rest of the team
-- and lost on browser data clear. This table makes it queryable per
-- organization, per cashier, and per period.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sale_feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         text        NOT NULL,
  organization_id uuid        NOT NULL,
  score           smallint    NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- One feedback per sale. If the cashier submits twice, the second wins
  -- via UPSERT in the API.
  CONSTRAINT sale_feedback_sale_unique UNIQUE (sale_id)
);

-- Index for "average CSAT in last N days per organization" queries.
CREATE INDEX IF NOT EXISTS idx_sale_feedback_org_created
  ON public.sale_feedback(organization_id, created_at DESC);

-- RLS: only members of the org can see feedback for that org. Inserts
-- happen via admin client in the API (service role bypasses RLS), so we
-- don't need an INSERT policy for end-users — only SELECT.
ALTER TABLE public.sale_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_feedback_select_own_org ON public.sale_feedback;
CREATE POLICY sale_feedback_select_own_org ON public.sale_feedback
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.sale_feedback IS 'Post-sale CSAT scores collected from the POS receipt modal.';
COMMENT ON COLUMN public.sale_feedback.score IS '1=Muy mala, 2=Mala, 3=Regular, 4=Buena, 5=Excelente';
