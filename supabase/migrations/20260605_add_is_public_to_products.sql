-- Migration: Add is_public column to products table
-- Date: 2026-06-05
-- Description: Permite controlar si un producto es visible en el catálogo/tienda
--              pública (online) de forma independiente de is_active (que controla
--              si el producto está disponible/activo en el POS interno).
--              is_active = activo en el sistema  |  is_public = visible al público

BEGIN;

-- Add is_public column if it doesn't exist (default true: los productos existentes
-- siguen siendo visibles públicamente para no romper el catálogo actual)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.products
        ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

        RAISE NOTICE 'Column is_public added to products table';
    ELSE
        RAISE NOTICE 'Column is_public already exists in products table';
    END IF;
END $$;

-- Índice parcial para acelerar las consultas del catálogo público
-- (filtran por is_active = true AND is_public = true)
CREATE INDEX IF NOT EXISTS idx_products_public
ON public.products(organization_id, is_public)
WHERE is_active = true AND is_public = true;

COMMIT;

-- Verification (uncomment to run manually)
-- SELECT
--     COUNT(*) AS total,
--     COUNT(*) FILTER (WHERE is_public) AS publicos,
--     COUNT(*) FILTER (WHERE NOT is_public) AS privados
-- FROM public.products;
