-- Indexes to speed up inventory report aggregation

CREATE INDEX IF NOT EXISTS products_org_stock_idx
  ON public.products (organization_id, stock_quantity);

CREATE INDEX IF NOT EXISTS products_org_category_stock_idx
  ON public.products (organization_id, category_id, stock_quantity);

NOTIFY pgrst, 'reload schema';

