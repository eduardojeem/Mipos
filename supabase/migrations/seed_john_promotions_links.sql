DO $$
DECLARE org UUID; promo TEXT; p1 TEXT; p3 TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  SELECT id INTO promo FROM public.promotions WHERE name='JE Promo 15%' AND organization_id=org;
  IF org IS NULL OR promo IS NULL THEN RETURN; END IF;
  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='JELAB_002';
  SELECT id INTO p3 FROM public.products WHERE organization_id=org AND sku='JECRE_002';
  IF p1 IS NOT NULL THEN
    INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
    VALUES (promo, p1, org) ON CONFLICT DO NOTHING;
  END IF;
  IF p3 IS NOT NULL THEN
    INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
    VALUES (promo, p3, org) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
  VALUES (promo, 1, org)
  ON CONFLICT (organization_id, position) DO NOTHING;
END $$;

