-- Migration: Add deleted_at to products (soft-delete / papelera)
-- Date: 2026-06-06
-- Description: Habilita el borrado reversible (papelera) de productos.
--              Un producto eliminado tiene deleted_at != NULL y is_active=false;
--              se puede restaurar poniendo deleted_at = NULL.
--              El borrado físico queda como acción explícita desde la papelera.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.products
        ADD COLUMN deleted_at TIMESTAMPTZ;

        RAISE NOTICE 'Column deleted_at added to products';
    ELSE
        RAISE NOTICE 'Column deleted_at already exists in products';
    END IF;
END $$;

-- Índice parcial: acelera el listado normal (excluye eliminados) y la papelera.
CREATE INDEX IF NOT EXISTS idx_products_not_deleted
    ON public.products(organization_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_deleted
    ON public.products(organization_id, deleted_at)
    WHERE deleted_at IS NOT NULL;

COMMIT;
