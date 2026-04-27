begin;

create extension if not exists pgcrypto;

do $$
declare
  oporg uuid := null;
  has_org_col boolean := false;
begin
  -- Detect organization support
  select exists(
    select 1 from information_schema.columns 
    where table_schema='public' and table_name='promotions' and column_name='organization_id'
  ) into has_org_col;

  if has_org_col then
    select id into oporg from public.organizations limit 1;
  end if;

  -- Insert base promotions if missing (by name)
  if not exists (select 1 from public.promotions where name = 'Descuento de Bienvenida') then
    if has_org_col then
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
      values (gen_random_uuid()::text, 'Descuento de Bienvenida', 'Obtén 15% de descuento en tu primera compra', 'PERCENTAGE', 15, now()::date, (now() + interval '30 days')::date, true, oporg);
    else
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active)
      values (gen_random_uuid()::text, 'Descuento de Bienvenida', 'Obtén 15% de descuento en tu primera compra', 'PERCENTAGE', 15, now()::date, (now() + interval '30 days')::date, true);
    end if;
  end if;

  if not exists (select 1 from public.promotions where name = 'Black Friday 30%') then
    if has_org_col then
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
      values (gen_random_uuid()::text, 'Black Friday 30%', 'Mega descuento del 30% en productos seleccionados', 'PERCENTAGE', 30, (now() - interval '1 day')::date, (now() + interval '14 days')::date, true, oporg);
    else
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active)
      values (gen_random_uuid()::text, 'Black Friday 30%', 'Mega descuento del 30% en productos seleccionados', 'PERCENTAGE', 30, (now() - interval '1 day')::date, (now() + interval '14 days')::date, true);
    end if;
  end if;

  if not exists (select 1 from public.promotions where name = 'Cyber Monday 20%') then
    if has_org_col then
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
      values (gen_random_uuid()::text, 'Cyber Monday 20%', 'Descuento especial de Cyber Monday', 'PERCENTAGE', 20, (now() + interval '5 days')::date, (now() + interval '20 days')::date, true, oporg);
    else
      insert into public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active)
      values (gen_random_uuid()::text, 'Cyber Monday 20%', 'Descuento especial de Cyber Monday', 'PERCENTAGE', 20, (now() + interval '5 days')::date, (now() + interval '20 days')::date, true);
    end if;
  end if;

  -- Link products to each promotion (random selection)
  -- For each promotion, attach up to 5 active products from the same organization (if present)
  insert into public.promotions_products (promotion_id, product_id)
  select p.id, pr.id
  from (
    select id, coalesce(organization_id, oporg) as org from public.promotions where name in ('Descuento de Bienvenida','Black Friday 30%','Cyber Monday 20%')
  ) p
  join lateral (
    select id from public.products 
    where (p.org is null or organization_id = p.org) and is_active = true
    order by random()
    limit 5
  ) pr on true
  on conflict do nothing;

  -- Add promotions to carousel positions if not present
  insert into public.promotions_carousel (promotion_id, position)
  select prom.id, pos.pos
  from (
    select 1 as pos, 'Descuento de Bienvenida' as name
    union all select 2, 'Black Friday 30%'
    union all select 3, 'Cyber Monday 20%'
  ) pos
  join public.promotions prom on prom.name = pos.name
  on conflict do nothing;

end $$;

commit;

