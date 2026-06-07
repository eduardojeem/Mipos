-- Migration: Create price tables (product_price_history + price_alerts)
-- Date: 2026-06-06
-- Description: Las tablas para el historial de precios y alertas de proveedores
--              nunca existieron en la BD. Esta migración las crea con
--              organization_id (multi-tenant) desde el inicio, FKs e índices.
--              Habilita la sección /dashboard/suppliers/price-history.
-- Reemplaza a 20260606_add_org_to_price_tables.sql (que asumía tablas existentes).

BEGIN;

-- ── product_price_history ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_price_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id          TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id         TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    price               NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    currency            TEXT NOT NULL DEFAULT 'PYG',
    effective_date      TIMESTAMPTZ NOT NULL DEFAULT now(),
    source              TEXT NOT NULL DEFAULT 'manual',
    document_ref        TEXT,
    notes               TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    unit                TEXT DEFAULT 'unit',
    min_order_quantity  INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_org
    ON public.product_price_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product
    ON public.product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_supplier
    ON public.product_price_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_price_history_effective_date
    ON public.product_price_history(effective_date DESC);

-- ── price_alerts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    product_id          TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    target_price        NUMERIC(14,2) NOT NULL CHECK (target_price >= 0),
    condition           TEXT NOT NULL,
    threshold           NUMERIC(14,2),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    notification_email  TEXT,
    last_triggered      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_org
    ON public.price_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product
    ON public.price_alerts(product_id);

COMMIT;

-- Nota de seguridad: el filtrado multi-tenant se aplica en la capa de API
-- (todas las queries filtran por organization_id). Si querés defensa en
-- profundidad, podés habilitar RLS con policies por organización después.
