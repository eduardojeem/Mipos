-- =============================================================================
-- Migration: Add POS-relevant product columns (wholesale, barcode, brand)
-- Date: 2026-05-15
--
-- Context: /api/pos/products requested wholesale_price, min_wholesale_quantity,
-- barcode, and brand columns that didn't exist in the products schema. The API
-- now has a defensive fallback (commit ff155cf) that drops to a minimal select
-- on schema mismatch, so the POS works without these columns — but features
-- like wholesale pricing and barcode scanning are disabled in that mode.
--
-- This migration adds the missing columns idempotently so the rich select can
-- succeed and unlock the full POS feature set. Safe to run multiple times.
-- =============================================================================

-- 1. Add the four missing columns. IF NOT EXISTS makes this idempotent.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_wholesale_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS brand text;

-- 2. Index for barcode lookup. Partial index so it doesn't bloat for
--    products without a barcode (the common case for non-supermarket businesses).
CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON public.products(barcode)
  WHERE barcode IS NOT NULL;

-- 3. Best-effort: ensure the FK products.category_id -> categories.id exists,
--    which is required by the categories!left join in the rich select.
--    If the constraint already exists with a different name, this DO block
--    skips it silently so the migration stays idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'products'
      AND kcu.column_name = 'category_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    BEGIN
      ALTER TABLE public.products
        ADD CONSTRAINT products_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.categories(id)
        ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      -- Constraint may exist under another name or there are orphan rows;
      -- log a notice but don't fail the whole migration. Admin can fix
      -- manually if needed.
      RAISE NOTICE 'Could not add products_category_id_fkey (already exists or has orphan rows): %', SQLERRM;
    END;
  END IF;
END $$;

-- 4. Sanity check note: after running this, /api/pos/products should stop
--    falling back to the minimal select. To verify, check the response body
--    metadata.usedMinimalFallback flag — should be false.
