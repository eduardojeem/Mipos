-- Fix malformed SKU regex constraint on products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_format;
ALTER TABLE public.products ADD CONSTRAINT products_sku_format
  CHECK (sku ~ '^[A-Z0-9_-]+$');
