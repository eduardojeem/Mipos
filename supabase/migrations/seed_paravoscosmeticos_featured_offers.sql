DO $$
DECLARE
  org UUID;
  promoA TEXT; promoB TEXT;
  p_labkit TEXT; p_sombras TEXT; p_delineador TEXT; p_termoprotector TEXT; p_brochas TEXT; p_splash TEXT; p_crema_coco TEXT;
  has_approval boolean := false;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  -- Detectar columna approval_status en promotions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='promotions' AND column_name='approval_status'
  ) INTO has_approval;

  -- Crear promociones destacadas (idempotente por nombre)
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Destacados Paravos 25%' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,start_date,end_date,is_active,organization_id,min_purchase_amount,max_discount_amount,usage_limit)
    VALUES (gen_random_uuid()::text,'Destacados Paravos 25%','Ofertas destacadas por tiempo limitado','PERCENTAGE',25, now(), now() + interval '21 days', TRUE, org, 0, NULL, 0)
    RETURNING id INTO promoA;
    IF has_approval THEN
      UPDATE public.promotions SET approval_status='approved', approved_at=now() WHERE id=promoA;
    END IF;
  ELSE
    SELECT id INTO promoA FROM public.promotions WHERE name='Destacados Paravos 25%' AND organization_id=org;
    UPDATE public.promotions SET is_active=TRUE, start_date=now(), end_date=now()+ interval '21 days' WHERE id=promoA;
    IF has_approval THEN UPDATE public.promotions SET approval_status='approved' WHERE id=promoA; END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Oferta Flash Fin de Semana 30%' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,start_date,end_date,is_active,organization_id,min_purchase_amount,max_discount_amount,usage_limit)
    VALUES (gen_random_uuid()::text,'Oferta Flash Fin de Semana 30%','Solo este fin de semana','PERCENTAGE',30, now(), now() + interval '3 days', TRUE, org, 0, NULL, 0)
    RETURNING id INTO promoB;
    IF has_approval THEN
      UPDATE public.promotions SET approval_status='approved', approved_at=now() WHERE id=promoB;
    END IF;
  ELSE
    SELECT id INTO promoB FROM public.promotions WHERE name='Oferta Flash Fin de Semana 30%' AND organization_id=org;
    UPDATE public.promotions SET is_active=TRUE, start_date=now(), end_date=now()+ interval '3 days' WHERE id=promoB;
    IF has_approval THEN UPDATE public.promotions SET approval_status='approved' WHERE id=promoB; END IF;
  END IF;

  -- Resolver productos por SKU
  SELECT id INTO p_labkit FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;
  SELECT id INTO p_sombras FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p_delineador FROM public.products WHERE organization_id=org AND sku='PVOJO_005' LIMIT 1;
  SELECT id INTO p_termoprotector FROM public.products WHERE organization_id=org AND sku='PVCAB_005' LIMIT 1;
  SELECT id INTO p_brochas FROM public.products WHERE organization_id=org AND sku='PVACCE_002' LIMIT 1;
  SELECT id INTO p_splash FROM public.products WHERE organization_id=org AND sku='PVFRAG_003' LIMIT 1;
  SELECT id INTO p_crema_coco FROM public.products WHERE organization_id=org AND sku='PVCOR_003' LIMIT 1;

  -- Vincular productos a las promociones
  IF promoA IS NOT NULL THEN
    IF p_labkit IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoA, p_labkit, org) ON CONFLICT DO NOTHING; END IF;
    IF p_sombras IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoA, p_sombras, org) ON CONFLICT DO NOTHING; END IF;
    IF p_delineador IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoA, p_delineador, org) ON CONFLICT DO NOTHING; END IF;
    IF p_brochas IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoA, p_brochas, org) ON CONFLICT DO NOTHING; END IF;
    IF p_splash IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoA, p_splash, org) ON CONFLICT DO NOTHING; END IF;
  END IF;

  IF promoB IS NOT NULL THEN
    IF p_crema_coco IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoB, p_crema_coco, org) ON CONFLICT DO NOTHING; END IF;
    IF p_termoprotector IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promoB, p_termoprotector, org) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Agregar al carrusel destacado si la tabla soporta organization_id; si no, insertar sin ese campo
  BEGIN
    IF promoA IS NOT NULL THEN
      BEGIN
        INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
        VALUES (promoA, 1, org)
        ON CONFLICT (organization_id, position) DO NOTHING;
      EXCEPTION WHEN undefined_column THEN
        INSERT INTO public.promotions_carousel (promotion_id, position)
        VALUES (promoA, 1)
        ON CONFLICT DO NOTHING;
      END;
    END IF;
    IF promoB IS NOT NULL THEN
      BEGIN
        INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
        VALUES (promoB, 2, org)
        ON CONFLICT (organization_id, position) DO NOTHING;
      EXCEPTION WHEN undefined_column THEN
        INSERT INTO public.promotions_carousel (promotion_id, position)
        VALUES (promoB, 2)
        ON CONFLICT DO NOTHING;
      END;
    END IF;
  END;
END $$;

