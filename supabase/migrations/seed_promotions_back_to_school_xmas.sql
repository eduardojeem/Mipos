BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  oporg UUID := NULL;
  cat_school TEXT := NULL;
  cat_ofi TEXT := NULL;
  cat_toys TEXT := NULL;
  cat_gifts TEXT := NULL;
  cat_elec TEXT := NULL;
  start_xmas DATE := make_date(extract(year from now())::int, 12, 1);
  end_xmas DATE := make_date(extract(year from now())::int + 1, 1, 6);
BEGIN
  SELECT id INTO oporg FROM public.organizations LIMIT 1;
  SELECT id INTO cat_school FROM public.categories WHERE name = 'Escolar';
  SELECT id INTO cat_ofi FROM public.categories WHERE name = 'Oficina';
  SELECT id INTO cat_toys FROM public.categories WHERE name = 'Juguetes';
  SELECT id INTO cat_gifts FROM public.categories WHERE name = 'Regalos';
  SELECT id INTO cat_elec FROM public.categories WHERE name = 'Electrónica';

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Back to School -15%') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Back to School -15%', '15% en útiles escolares con mínimo de compra', 'PERCENTAGE', 15, 100, NULL, 200, (now() + interval '7 days')::date, (now() + interval '37 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Back to School -$20') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Back to School -$20', '$20 de descuento sobre $120 en escolares y oficina', 'FIXED_AMOUNT', 20, 120, NULL, 300, (now() + interval '5 days')::date, (now() + interval '35 days')::date, true, oporg);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Navidad -25%') THEN
    INSERT INTO public.promotions (id, name, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, start_date, end_date, is_active, organization_id)
    VALUES (gen_random_uuid()::text, 'Navidad -25%', '25% con tope por transacción', 'PERCENTAGE', 25, 0, 100, 2000, start_xmas, end_xmas, true, oporg);
  END IF;

  INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
  SELECT p.id, pr.id, p.org
  FROM (
    SELECT id, organization_id AS org, 'BTS15' AS tag FROM public.promotions WHERE name = 'Back to School -15%'
    UNION ALL
    SELECT id, organization_id AS org, 'BTS20' AS tag FROM public.promotions WHERE name = 'Back to School -$20'
    UNION ALL
    SELECT id, organization_id AS org, 'XMAS' AS tag FROM public.promotions WHERE name = 'Navidad -25%'
  ) p
  JOIN LATERAL (
    SELECT id FROM public.products 
    WHERE (p.org IS NULL OR organization_id = p.org)
      AND (
        (p.tag IN ('BTS15','BTS20') AND (
            (cat_school IS NULL OR category_id = cat_school) OR
            (cat_ofi IS NULL OR category_id = cat_ofi)
        ))
        OR
        (p.tag = 'XMAS' AND (
            (cat_gifts IS NULL OR category_id = cat_gifts) OR
            (cat_toys IS NULL OR category_id = cat_toys) OR
            (cat_elec IS NULL OR category_id = cat_elec)
        ))
      )
    ORDER BY random()
    LIMIT CASE WHEN p.tag = 'XMAS' THEN 10 ELSE 8 END
  ) pr ON TRUE
  ON CONFLICT DO NOTHING;

  WITH candidates AS (
    SELECT prom.id, prom.organization_id, pos.pos,
           (SELECT COUNT(*) FROM public.promotions_carousel pc WHERE pc.organization_id = prom.organization_id) AS existing,
           ROW_NUMBER() OVER (ORDER BY pos.pos) AS rn
    FROM (
      SELECT 9 AS pos, 'Back to School -15%' AS name
      UNION ALL SELECT 10, 'Back to School -$20'
      UNION ALL SELECT 11, 'Navidad -25%'
    ) pos
    JOIN public.promotions prom ON prom.name = pos.name
  )
  INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
  SELECT id, pos, organization_id
  FROM candidates
  WHERE rn <= GREATEST(0, 10 - existing)
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
