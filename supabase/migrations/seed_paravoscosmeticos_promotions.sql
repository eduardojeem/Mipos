DO $$
DECLARE
  org UUID;
  promo1_id TEXT;
  promo2_id TEXT;
  prod_base TEXT;
  prod_paleta TEXT;
  prod_shampoo TEXT;
  prod_labial TEXT;
BEGIN
  -- Buscar la organización
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  -- 1. Crear Promociones
  -- Promoción 1: Descuento de Bienvenida 15%
  INSERT INTO public.promotions (
    id, name, discount_type, discount_value, 
    start_date, end_date, is_active, organization_id, 
    min_purchase_amount, max_discount_amount, usage_limit
  )
  VALUES (
    gen_random_uuid()::text, 'Oferta Bienvenida 15%', 'PERCENTAGE', 15, 
    now(), now() + interval '30 days', TRUE, org, 
    0, 50000, 0
  )
  RETURNING id INTO promo1_id;

  -- Promoción 2: Super Sale Fijo
  INSERT INTO public.promotions (
    id, name, discount_type, discount_value, 
    start_date, end_date, is_active, organization_id, 
    min_purchase_amount, max_discount_amount, usage_limit
  )
  VALUES (
    gen_random_uuid()::text, 'Super Sale 20.000 Gs', 'FIXED_AMOUNT', 20000, 
    now(), now() + interval '15 days', TRUE, org, 
    100000, 20000, 0
  )
  RETURNING id INTO promo2_id;

  -- 2. Obtener IDs de algunos productos de Paravos para asociarlos
  SELECT id INTO prod_base FROM public.products WHERE sku='PVBASE_001' AND organization_id=org LIMIT 1;
  SELECT id INTO prod_paleta FROM public.products WHERE sku='PVOJO_001' AND organization_id=org LIMIT 1;
  SELECT id INTO prod_shampoo FROM public.products WHERE sku='PVCAB_001' AND organization_id=org LIMIT 1;
  SELECT id INTO prod_labial FROM public.products WHERE sku='PVLAB_001' AND organization_id=org LIMIT 1;

  -- 3. Vincular productos a las promociones
  IF promo1_id IS NOT NULL THEN
    IF prod_base IS NOT NULL THEN
      INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo1_id, prod_base, org) ON CONFLICT DO NOTHING;
    END IF;
    IF prod_paleta IS NOT NULL THEN
      INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo1_id, prod_paleta, org) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF promo2_id IS NOT NULL THEN
    IF prod_shampoo IS NOT NULL THEN
      INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo2_id, prod_shampoo, org) ON CONFLICT DO NOTHING;
    END IF;
    IF prod_labial IS NOT NULL THEN
      INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo2_id, prod_labial, org) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

END $$;
