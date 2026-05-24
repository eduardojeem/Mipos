ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS fulfillment_type TEXT DEFAULT 'DELIVERY';

ALTER TABLE public.sales
DROP CONSTRAINT IF EXISTS sales_fulfillment_type_check;

ALTER TABLE public.sales
ADD CONSTRAINT sales_fulfillment_type_check
CHECK (fulfillment_type IN ('DELIVERY', 'PICKUP'));

UPDATE public.sales
SET fulfillment_type = CASE
  WHEN COALESCE(shipping_cost, 0) = 0
    AND NULLIF(BTRIM(COALESCE(customer_address, '')), '') IS NULL
    THEN 'PICKUP'
  ELSE 'DELIVERY'
END
WHERE fulfillment_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_sales_fulfillment_type
ON public.sales (organization_id, fulfillment_type);
