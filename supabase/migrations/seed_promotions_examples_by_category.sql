BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  oporg UUID := NULL;
  cat_elec TEXT := NULL;
  cat_moda TEXT := NULL;
  cat_hogar TEXT := NULL;
  cat_ofi TEXT := NULL;
  next_sat DATE := (date_trunc('week', now()) + interval '6 days')::date;
  next_sun DATE := (date_trunc('week', now()) + interval '7 days')::date;
BEGIN
  SELECT id INTO oporg FROM public.organizations LIMIT 1;
  SELECT id INTO cat_elec FROM public.categories WHERE name ILIKE 'Electr%';
  SELECT id INTO cat_moda FROM public.categories WHERE name ILIKE 'Moda%';
  SELECT id INTO cat_hogar FROM public.categories WHERE name ILIKE 'Hogar%';
  SELECT id INTO cat_ofi FROM public.categories WHERE name ILIKE 'Oficina%' OR name ILIKE 'Escolar%';

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Electrónica -10%') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Electrónica -10%', '10% en electrónica', 'PERCENTAGE', 10, 50, 200, 1000, now()::date, (now() + interval '21 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Moda -25% Fin de Semana') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Moda -25% Fin de Semana', '25% solo fin de semana', 'PERCENTAGE', 25, 0, NULL, 500, next_sat, next_sun, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Hogar -20% Primavera') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Hogar -20% Primavera', '20% en hogar temporada primavera', 'PERCENTAGE', 20, 100, 300, 800, (now() + interval '30 days')::date, (now() + interval '60 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Oficina -$30 Útiles') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Oficina -$30 Útiles', '$30 menos en útiles y oficina sobre $150', 'FIXED_AMOUNT', 30, 150, NULL, 400, (now() + interval '3 days')::date, (now() + interval '33 days')::date, true, oporg);
  END IF;

  INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
  SELECT p.id, pr.id, p.org
  FROM (
    SELECT id, organization_id AS org, name, 'ELEC' AS tag FROM public.promotions WHERE name = 'Electrónica -10%'
    UNION ALL
    SELECT id, organization_id AS org, name, 'MODA' AS tag FROM public.promotions WHERE name = 'Moda -25% Fin de Semana'
    UNION ALL
    SELECT id, organization_id AS org, name, 'HOGAR' AS tag FROM public.promotions WHERE name = 'Hogar -20% Primavera'
    UNION ALL
    SELECT id, organization_id AS org, name, 'OFI' AS tag FROM public.promotions WHERE name = 'Oficina -$30 Útiles'
  ) p
  JOIN LATERAL (
    SELECT id FROM public.products 
    WHERE (p.org IS NULL OR organization_id = p.org)
      AND (
        (p.tag = 'ELEC' AND (cat_elec IS NULL OR category_id = cat_elec)) OR
        (p.tag = 'MODA' AND (cat_moda IS NULL OR category_id = cat_moda)) OR
        (p.tag = 'HOGAR' AND (cat_hogar IS NULL OR category_id = cat_hogar)) OR
        (p.tag = 'OFI' AND (cat_ofi IS NULL OR category_id = cat_ofi))
      )
    ORDER BY random()
    LIMIT 6
  ) pr ON TRUE
  ON CONFLICT DO NOTHING;

  INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
  SELECT prom.id, pos.pos, prom.organization_id
  FROM (
    SELECT 5 AS pos, 'Electrónica -10%' AS name
    UNION ALL SELECT 6, 'Moda -25% Fin de Semana'
    UNION ALL SELECT 7, 'Hogar -20% Primavera'
    UNION ALL SELECT 8, 'Oficina -$30 Útiles'
  ) pos
  JOIN public.promotions prom ON prom.name = pos.name
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
