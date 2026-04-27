DO $$
DECLARE con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.products'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%sku ~*%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', con_name);
  END IF;

  ALTER TABLE public.products
    ADD CONSTRAINT products_sku_format_chk CHECK (sku ~* '^[A-Z0-9_\-]+$');
END $$;

