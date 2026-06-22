BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_schedule_exceptions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_profile_id UUID        NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    date             DATE        NOT NULL,
    reason           TEXT        NOT NULL, -- e.g., "Vacaciones", "Enfermo", "Feriado"
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Un profesional solo puede tener una excepción por día (al menos para "días completos" libres)
    CONSTRAINT staff_exception_unique_date UNIQUE (staff_profile_id, date)
);

CREATE INDEX IF NOT EXISTS staff_exceptions_date_idx
    ON public.staff_schedule_exceptions (staff_profile_id, date);

-- Habilitar RLS
ALTER TABLE public.staff_schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation" ON public.staff_schedule_exceptions;
CREATE POLICY "Tenant Isolation" ON public.staff_schedule_exceptions
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

COMMIT;
