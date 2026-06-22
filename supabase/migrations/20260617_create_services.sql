-- =============================================================================
-- MIGRATION: 20260617_create_services
-- Catálogo de SERVICIOS (vertical BARBERSHOP)
--
-- Un "servicio" es el equivalente al producto pero SIN stock: corte, barba,
-- color, etc. Tiene duración (para la agenda de turnos) y precio (cobrable en POS).
-- Es org-scoped y sigue el mismo aislamiento multi-tenant que products/categories.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.services (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    description     TEXT,
    duration_min    INTEGER     NOT NULL DEFAULT 30,   -- duración en minutos (para la agenda)
    price           NUMERIC(14,2) NOT NULL DEFAULT 0,  -- precio del servicio
    category        TEXT,                              -- agrupador libre: "Corte", "Color", "Barba"
    color           TEXT,                              -- hex para mostrar en el calendario de turnos
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT services_duration_positive CHECK (duration_min > 0),
    CONSTRAINT services_price_non_negative CHECK (price >= 0)
);

-- Un servicio no se repite por nombre dentro de la misma organización
-- (case-insensitive, igual que el chequeo de categories en la API).
CREATE UNIQUE INDEX IF NOT EXISTS services_org_name_unique
    ON public.services (organization_id, lower(name));

CREATE INDEX IF NOT EXISTS services_org_active_idx
    ON public.services (organization_id, is_active);

-- ---------------------------------------------------------------------------
-- updated_at automático (mismo patrón que el resto del schema)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.set_services_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: aislamiento multi-tenant idéntico a products/categories.
-- get_my_org_ids() ya existe (migración 20260125_enable_saas_multitenancy).
-- El service_role (usado por la API server-side) bypassea RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation" ON public.services;
CREATE POLICY "Tenant Isolation" ON public.services
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

COMMIT;
