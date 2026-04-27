-- Indexes to speed up /dashboard/suppliers queries

CREATE INDEX IF NOT EXISTS suppliers_org_created_at_idx
  ON public.suppliers (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS suppliers_org_is_active_idx
  ON public.suppliers (organization_id, is_active);

CREATE INDEX IF NOT EXISTS suppliers_org_category_idx
  ON public.suppliers (organization_id, (lower(contact_info->>'category')));

CREATE INDEX IF NOT EXISTS purchases_org_supplier_idx
  ON public.purchases (organization_id, supplier_id);

NOTIFY pgrst, 'reload schema';

