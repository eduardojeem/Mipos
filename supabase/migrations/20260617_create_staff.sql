-- =============================================================================
-- MIGRATION: 20260617_create_staff
-- PROFESIONALES (barberos) — vertical BARBERSHOP
--
-- Un profesional es un USUARIO existente de la organización (mantiene su login y
-- su rol operativo) al que se le agrega una FICHA de staff agendable:
-- especialidad, comisión, color en la agenda y horarios de atención.
--
-- No se inventa un rol nuevo en el enum: el "es barbero" vive en staff_profiles.
-- Esto reutiliza la gestión de usuarios existente y no toca la jerarquía de roles.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE: staff_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    display_name    TEXT,                              -- override opcional; si es NULL se usa users.full_name
    specialty       TEXT,                              -- "Barbero", "Colorista", etc.
    commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,   -- % de comisión sobre el servicio
    color           TEXT,                              -- hex para identificar al profesional en la agenda
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_commission_range CHECK (commission_pct >= 0 AND commission_pct <= 100),
    -- Un usuario no puede tener dos fichas de staff en la misma organización
    CONSTRAINT staff_org_user_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS staff_profiles_org_active_idx
    ON public.staff_profiles (organization_id, is_active);

-- ---------------------------------------------------------------------------
-- TABLE: staff_working_hours
-- Horarios de atención por día de semana. organization_id se incluye para RLS
-- directa y filtrado simple. day_of_week: 0=domingo … 6=sábado (ISO JS getDay()).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_working_hours (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    staff_profile_id UUID        NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    day_of_week      SMALLINT    NOT NULL,
    start_time       TIME        NOT NULL,
    end_time         TIME        NOT NULL,

    CONSTRAINT swh_day_range CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT swh_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS staff_working_hours_staff_idx
    ON public.staff_working_hours (staff_profile_id);

-- ---------------------------------------------------------------------------
-- updated_at automático en staff_profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_staff_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
    BEFORE UPDATE ON public.staff_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_staff_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: aislamiento multi-tenant (get_my_org_ids() ya existe). El service_role
-- usado por la API server-side bypassea RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.staff_profiles;
CREATE POLICY "Tenant Isolation" ON public.staff_profiles
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.staff_working_hours;
CREATE POLICY "Tenant Isolation" ON public.staff_working_hours
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

COMMIT;
