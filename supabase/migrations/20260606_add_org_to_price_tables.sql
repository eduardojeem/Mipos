-- Migration: Add organization_id to price tables (multi-tenant hardening)
-- Date: 2026-06-06
-- Description: product_price_history y price_alerts no tenían organization_id,
--              lo que permitía fuga de datos entre organizaciones. Esta migración
--              agrega la columna (si la tabla existe), hace backfill desde el
--              proveedor/producto asociado y crea índices.
--              Es idempotente y tolerante a que las tablas no existan todavía.

BEGIN;

-- ── product_price_history ─────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'product_price_history'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'product_price_history'
              AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.product_price_history
            ADD COLUMN organization_id UUID;

            -- Backfill desde el proveedor asociado
            UPDATE public.product_price_history pph
            SET organization_id = s.organization_id
            FROM public.suppliers s
            WHERE pph.supplier_id = s.id
              AND pph.organization_id IS NULL;

            -- Fallback: backfill desde el producto si quedó algo sin org
            UPDATE public.product_price_history pph
            SET organization_id = p.organization_id
            FROM public.products p
            WHERE pph.product_id = p.id
              AND pph.organization_id IS NULL;

            CREATE INDEX IF NOT EXISTS idx_price_history_org
            ON public.product_price_history(organization_id);

            RAISE NOTICE 'organization_id added to product_price_history';
        END IF;
    END IF;
END $$;

-- ── price_alerts ──────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'price_alerts'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'price_alerts'
              AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.price_alerts
            ADD COLUMN organization_id UUID;

            -- Backfill desde el producto asociado
            UPDATE public.price_alerts pa
            SET organization_id = p.organization_id
            FROM public.products p
            WHERE pa.product_id = p.id
              AND pa.organization_id IS NULL;

            CREATE INDEX IF NOT EXISTS idx_price_alerts_org
            ON public.price_alerts(organization_id);

            RAISE NOTICE 'organization_id added to price_alerts';
        END IF;
    END IF;
END $$;

COMMIT;
