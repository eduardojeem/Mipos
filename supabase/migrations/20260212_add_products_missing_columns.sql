-- Add missing columns used by frontend API on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_id TEXT;

-- Indexes for common filters/sorts
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sale_price ON public.products(sale_price);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at);

-- FK for supplier relationship and ensure constraint names compatible with PostgREST joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_supplier_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_supplier_id_fkey FOREIGN KEY (supplier_id)
      REFERENCES public.suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure category fk has the conventional name so the join categories!products_category_id_fkey works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id)
      REFERENCES public.categories(id) ON DELETE CASCADE;
  END IF;
END $$;

