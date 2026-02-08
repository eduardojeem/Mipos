-- Crear tablas de CAJA en Supabase para alinearlas con el modelo Prisma

-- 1. Tabla cash_sessions
CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    opened_by       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    closed_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
    opening_amount  numeric(18,2) NOT NULL,
    closing_amount  numeric(18,2),
    system_expected numeric(18,2),
    discrepancy_amount numeric(18,2),
    status          text NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED, CANCELLED
    notes           text,
    opened_at       timestamptz NOT NULL DEFAULT now(),
    closed_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices recomendados (coinciden con prisma)
CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_status ON public.cash_sessions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_org_opened ON public.cash_sessions(organization_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON public.cash_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_closed_at ON public.cash_sessions(closed_at);


-- 2. Tabla cash_movements
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id      uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    type            text NOT NULL, -- IN, OUT, SALE, RETURN, ADJUSTMENT
    amount          numeric(18,2) NOT NULL,
    reason          text,
    reference_type  text,
    reference_id    text,
    created_by      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_org_session ON public.cash_movements(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_org_created ON public.cash_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON public.cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON public.cash_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_reference ON public.cash_movements(reference_type, reference_id);


-- 3. Tabla cash_counts
CREATE TABLE IF NOT EXISTS public.cash_counts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id      uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    denomination    numeric(18,2) NOT NULL,
    quantity        integer NOT NULL DEFAULT 0,
    total           numeric(18,2) NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_counts_org_session ON public.cash_counts(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_cash_counts_session ON public.cash_counts(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_counts_denomination ON public.cash_counts(denomination);


-- 4. Tabla cash_discrepancies
CREATE TABLE IF NOT EXISTS public.cash_discrepancies (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id      uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    type            text NOT NULL, -- SHORTAGE, OVERAGE
    amount          numeric(18,2) NOT NULL,
    explained       boolean NOT NULL DEFAULT false,
    explanation     text,
    reported_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_org_session ON public.cash_discrepancies(organization_id, session_id);
CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_session ON public.cash_discrepancies(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_type ON public.cash_discrepancies(type);
CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_created_at ON public.cash_discrepancies(created_at);


-- 5. Habilitar RLS y aplicar políticas multi-tenant
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_discrepancies ENABLE ROW LEVEL SECURITY;

-- Helper de organización para políticas RLS
CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS TABLE(org_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id AS org_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

-- Políticas estándar por organización
DROP POLICY IF EXISTS "Org Access Cash Sessions" ON public.cash_sessions;
CREATE POLICY "Org Access Cash Sessions" ON public.cash_sessions
  USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

DROP POLICY IF EXISTS "Org Access Cash Movements" ON public.cash_movements;
CREATE POLICY "Org Access Cash Movements" ON public.cash_movements
  USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

DROP POLICY IF EXISTS "Org Access Cash Counts" ON public.cash_counts;
CREATE POLICY "Org Access Cash Counts" ON public.cash_counts
  USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

DROP POLICY IF EXISTS "Org Access Cash Discrepancies" ON public.cash_discrepancies;
CREATE POLICY "Org Access Cash Discrepancies" ON public.cash_discrepancies
  USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
  WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

