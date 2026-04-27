begin;

do $$
declare
  has_pp_org boolean := false;
  oporg uuid := null;
begin
  -- Detect organization column on promotions_products
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='promotions_products' and column_name='organization_id'
  ) into has_pp_org;

  -- Detect promotions organization column and pick an org id
  if exists (
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='promotions' and column_name='organization_id'
  ) then
    select id into oporg from public.organizations limit 1;
  end if;

  -- Re-insert promotions by name (idempotent)
  if not exists (select 1 from public.promotions where name = 'Descuento de Bienvenida') then
    insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    values (gen_random_uuid()::text, 'Descuento de Bienvenida', 'Obtén 15% de descuento en tu primera compra', 'PERCENTAGE', 15, now()::date, (now() + interval '30 days')::date, true, oporg);
  end if;
  if not exists (select 1 from public.promotions where name = 'Black Friday 30%') then
    insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    values (gen_random_uuid()::text, 'Black Friday 30%', 'Mega descuento del 30% en productos seleccionados', 'PERCENTAGE', 30, (now() - interval '1 day')::date, (now() + interval '14 days')::date, true, oporg);
  end if;
  if not exists (select 1 from public.promotions where name = 'Cyber Monday 20%') then
    insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    values (gen_random_uuid()::text, 'Cyber Monday 20%', 'Descuento especial de Cyber Monday', 'PERCENTAGE', 20, (now() + interval '5 days')::date, (now() + interval '20 days')::date, true, oporg);
  end if;

  -- Link products with or without organization_id according to schema
  if has_pp_org then
    insert into public.promotions_products (promotion_id, product_id, organization_id)
    select p.id, pr.id, p.org
    from (
      select id, organization_id as org from public.promotions where name in ('Descuento de Bienvenida','Black Friday 30%','Cyber Monday 20%')
    ) p
    join lateral (
      select id from public.products 
      where (p.org is null or organization_id = p.org) and is_active = true
      order by random()
      limit 5
    ) pr on true
    on conflict do nothing;
  else
    insert into public.promotions_products (promotion_id, product_id)
    select p.id, pr.id
    from (
      select id, organization_id as org from public.promotions where name in ('Descuento de Bienvenida','Black Friday 30%','Cyber Monday 20%')
    ) p
    join lateral (
      select id from public.products 
      where (p.org is null or organization_id = p.org) and is_active = true
      order by random()
      limit 5
    ) pr on true
    on conflict do nothing;
  end if;
end $$;

commit;

