-- Indexes to speed up /dashboard/returns queries

CREATE INDEX IF NOT EXISTS returns_org_created_at_idx
  ON public.returns (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS returns_org_status_created_at_idx
  ON public.returns (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS returns_org_original_sale_idx
  ON public.returns (organization_id, original_sale_id);

CREATE INDEX IF NOT EXISTS return_items_return_id_idx
  ON public.return_items (return_id);

NOTIFY pgrst, 'reload schema';

