-- =============================================================================
-- MIGRATION: 20260617_add_vertical_to_organizations
-- Vertical / tipo de negocio por organización (multi-rubro)
--
-- OBJETIVO:
--   Introducir el concepto de "vertical" (rubro operativo) en la organización.
--   El vertical define QUÉ MÓDULOS ve cada empresa, sin mezclar el core:
--
--     RETAIL     → tienda/inventario (comportamiento actual, default)
--     BARBERSHOP → barbería: agenda de turnos, servicios, profesionales
--
--   NO confundir con:
--     - organizations.marketplace_category_id → rubro PÚBLICO del marketplace (SEO)
--     - business_config.legalInfo.businessType → forma legal (S.A., unipersonal…)
--
--   El vertical es ESTRUCTURAL (gobierna navegación/rutas/módulos), por eso vive
--   como columna en organizations y no dentro del blob JSON business_config.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- COLUMN: organizations.vertical
-- Default 'RETAIL' para no alterar el comportamiento de ninguna org existente.
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS vertical TEXT NOT NULL DEFAULT 'RETAIL';

-- Restringir a los verticales soportados. Ampliar esta lista al agregar rubros
-- nuevos (ej: 'RESTAURANT', 'SPA').
ALTER TABLE public.organizations
    DROP CONSTRAINT IF EXISTS organizations_vertical_check;

ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_vertical_check
    CHECK (vertical IN ('RETAIL', 'BARBERSHOP'));

-- Backfill explícito por las dudas (orgs creadas antes del default).
UPDATE public.organizations
    SET vertical = 'RETAIL'
    WHERE vertical IS NULL;

COMMENT ON COLUMN public.organizations.vertical IS
    'Vertical operativo del negocio: RETAIL (tienda, default) o BARBERSHOP (agenda/servicios). Gobierna qué módulos ve la org.';

COMMIT;
