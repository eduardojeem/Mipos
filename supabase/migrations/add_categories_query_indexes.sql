-- Indexes to speed up /dashboard/categories queries

CREATE INDEX IF NOT EXISTS categories_org_name_idx
  ON public.categories (organization_id, name);

CREATE INDEX IF NOT EXISTS categories_org_created_at_idx
  ON public.categories (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS products_org_category_id_idx
  ON public.products (organization_id, category_id);

NOTIFY pgrst, 'reload schema';

