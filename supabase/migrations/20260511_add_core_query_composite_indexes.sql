begin;

create index if not exists idx_sales_org_created_at
  on public.sales (organization_id, created_at desc);

create index if not exists idx_products_org_active_updated_at
  on public.products (organization_id, is_active, updated_at desc);

create index if not exists idx_customers_org_deleted_created_at
  on public.customers (organization_id, deleted_at, created_at desc);

commit;
