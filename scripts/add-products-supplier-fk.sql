ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id TEXT;

UPDATE public.products p
SET supplier_id = NULL
WHERE supplier_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.suppliers s WHERE s.id = p.supplier_id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_supplier'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT fk_products_supplier
      FOREIGN KEY (supplier_id)
      REFERENCES public.suppliers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);