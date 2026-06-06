-- Align products with the dashboard create/edit modal payload.
-- Existing databases may only have the legacy inventory columns, which makes
-- PUT /api/products/:id fail when optional IVA/cosmetic fields are submitted.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS offer_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_wholesale_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock integer,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_id text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS iva_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_rate numeric(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS shade text,
  ADD COLUMN IF NOT EXISTS skin_type text,
  ADD COLUMN IF NOT EXISTS ingredients text,
  ADD COLUMN IF NOT EXISTS volume text,
  ADD COLUMN IF NOT EXISTS spf integer,
  ADD COLUMN IF NOT EXISTS finish text,
  ADD COLUMN IF NOT EXISTS coverage text,
  ADD COLUMN IF NOT EXISTS waterproof boolean,
  ADD COLUMN IF NOT EXISTS vegan boolean,
  ADD COLUMN IF NOT EXISTS cruelty_free boolean,
  ADD COLUMN IF NOT EXISTS expiration_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_products_org_active_updated
  ON public.products (organization_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON public.products (barcode)
  WHERE barcode IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_supplier_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.products
        ADD CONSTRAINT products_supplier_id_fkey
        FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
        ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add products_supplier_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;
