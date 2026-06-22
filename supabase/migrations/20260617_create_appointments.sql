-- =============================================================================
-- MIGRATION: 20260617_create_appointments
-- AGENDA DE TURNOS (vertical BARBERSHOP)
--
-- Un turno = cliente + servicio + profesional + franja horaria + estado.
-- customer_id / sale_id son TEXT porque customers.id y sales.id son cuid (no uuid).
-- customer_id es opcional (walk-in): en ese caso se usa customer_name libre.
-- sale_id se completa cuando el turno se cobra (paso 5) → puente con el core.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.appointments (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_profile_id UUID        NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    service_id       UUID        NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    customer_id      TEXT        REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name    TEXT,                              -- para walk-ins sin ficha de cliente
    start_at         TIMESTAMPTZ NOT NULL,
    end_at           TIMESTAMPTZ NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'BOOKED',  -- BOOKED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
    price            NUMERIC(14,2) NOT NULL DEFAULT 0,  -- snapshot del precio del servicio al reservar
    notes            TEXT,
    sale_id          TEXT        REFERENCES public.sales(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT appointments_time_order CHECK (end_at > start_at),
    CONSTRAINT appointments_status_valid CHECK (status IN ('BOOKED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'))
);

CREATE INDEX IF NOT EXISTS appointments_org_start_idx
    ON public.appointments (organization_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_staff_start_idx
    ON public.appointments (staff_profile_id, start_at);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.set_appointments_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: aislamiento multi-tenant. service_role (API server-side) bypassea.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.appointments;
CREATE POLICY "Tenant Isolation" ON public.appointments
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

COMMIT;
