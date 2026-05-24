ALTER TABLE public.sales
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.sales
  DROP CONSTRAINT IF EXISTS fk_sales_user;

UPDATE public.sales AS s
SET user_id = NULL
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = s.user_id
  );

ALTER TABLE public.sales
  ADD CONSTRAINT fk_sales_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.sales
  VALIDATE CONSTRAINT fk_sales_user;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);

UPDATE public.sale_items
SET subtotal = quantity * unit_price
WHERE subtotal IS NULL;
