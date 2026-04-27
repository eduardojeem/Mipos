BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  oporg UUID := NULL;
BEGIN
  SELECT id INTO oporg FROM public.organizations LIMIT 1;

  -- Base sample promotions (idempotent by name)
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Descuento de Bienvenida') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Descuento de Bienvenida', 'Obtén 15% de descuento en tu primera compra', 'PERCENTAGE', 15, now()::date, (now() + interval '30 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Black Friday 30%') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Black Friday 30%', 'Mega descuento del 30% en productos seleccionados', 'PERCENTAGE', 30, (now() - interval '1 day')::date, (now() + interval '14 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Cyber Monday 20%') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Cyber Monday 20%', 'Descuento especial de Cyber Monday', 'PERCENTAGE', 20, (now() + interval '5 days')::date, (now() + interval '20 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Promo 2x1 Verano') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Promo 2x1 Verano', 'Llévate 2 y paga 1 en artículos seleccionados', 'FIXED_AMOUNT', 0, (now() + interval '10 days')::date, (now() + interval '40 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Ahorra $50 en compras') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Ahorra $50 en compras', 'Descuento fijo de $50 en compras mayores a $200', 'FIXED_AMOUNT', 50, (now() + interval '2 days')::date, (now() + interval '32 days')::date, true, oporg);
  END IF;

  -- Link up to 5 active products per promotion with org
  INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
  SELECT p.id, pr.id, p.org
  FROM (
    SELECT id, organization_id AS org 
    FROM public.promotions 
    WHERE name IN ('Descuento de Bienvenida','Black Friday 30%','Cyber Monday 20%','Promo 2x1 Verano','Ahorra $50 en compras')
  ) p
  JOIN LATERAL (
    SELECT id FROM public.products 
    WHERE (p.org IS NULL OR organization_id = p.org) AND (CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name='is_active') THEN is_active ELSE TRUE END)
    ORDER BY random()
    LIMIT 5
  ) pr ON TRUE
  ON CONFLICT DO NOTHING;

  -- Add promotions to carousel by org position
  INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
  SELECT prom.id, pos.pos, prom.organization_id
  FROM (
    SELECT 1 AS pos, 'Descuento de Bienvenida' AS name
    UNION ALL SELECT 2, 'Black Friday 30%'
    UNION ALL SELECT 3, 'Cyber Monday 20%'
    UNION ALL SELECT 4, 'Promo 2x1 Verano'
  ) pos
  JOIN public.promotions prom ON prom.name = pos.name
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
