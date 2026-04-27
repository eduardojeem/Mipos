DO $$
DECLARE
  org UUID;
  p_frag TEXT; p_perf1 TEXT; p_perf2 TEXT; p_brocha TEXT; p_glitter TEXT; p_gel TEXT; p_labkit TEXT;
  promo_frag TEXT; promo_acce TEXT; promo_upcoming TEXT; promo_expired TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  -- Productos por SKU (usados por el dashboard)
  SELECT id INTO p_frag   FROM public.products WHERE organization_id=org AND sku='PVFRAG_003' LIMIT 1;
  SELECT id INTO p_perf1  FROM public.products WHERE organization_id=org AND sku='PVPERF_001' LIMIT 1;
  SELECT id INTO p_perf2  FROM public.products WHERE organization_id=org AND sku='PVPERF_002' LIMIT 1;
  SELECT id INTO p_brocha FROM public.products WHERE organization_id=org AND sku='PVACCE_002' LIMIT 1;
  SELECT id INTO p_glitter FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p_gel    FROM public.products WHERE organization_id=org AND sku='PVOJO_005' LIMIT 1;
  SELECT id INTO p_labkit FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;

  -- Activa: Fragancias 15%
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Fragancias 15%' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,min_purchase_amount,max_discount_amount,usage_limit,start_date,end_date,is_active,organization_id)
    VALUES (gen_random_uuid()::text,'Fragancias 15%','Descuento en body splash y perfumes','PERCENTAGE',15,0,NULL,0, now() - interval '2 days', now() + interval '20 days', TRUE, org)
    RETURNING id INTO promo_frag;
  ELSE
    SELECT id INTO promo_frag FROM public.promotions WHERE name='Fragancias 15%' AND organization_id=org;
    UPDATE public.promotions SET is_active=TRUE, start_date=now()- interval '2 days', end_date=now()+ interval '20 days' WHERE id=promo_frag;
  END IF;

  -- Activa: Outlet Accesorios 25%
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Outlet Accesorios 25%' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,min_purchase_amount,max_discount_amount,usage_limit,start_date,end_date,is_active,organization_id)
    VALUES (gen_random_uuid()::text,'Outlet Accesorios 25%','Liquidación de accesorios','PERCENTAGE',25,0,NULL,0, now() - interval '1 day', now() + interval '7 days', TRUE, org)
    RETURNING id INTO promo_acce;
  ELSE
    SELECT id INTO promo_acce FROM public.promotions WHERE name='Outlet Accesorios 25%' AND organization_id=org;
    UPDATE public.promotions SET is_active=TRUE, start_date=now()- interval '1 day', end_date=now()+ interval '7 days' WHERE id=promo_acce;
  END IF;

  -- Próxima: Maquillaje 10% (upcoming)
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Maquillaje 10% (Próxima)' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,min_purchase_amount,max_discount_amount,usage_limit,start_date,end_date,is_active,organization_id)
    VALUES (gen_random_uuid()::text,'Maquillaje 10% (Próxima)','Comienza en 3 días','PERCENTAGE',10,0,100000,0, now() + interval '3 days', now() + interval '14 days', TRUE, org)
    RETURNING id INTO promo_upcoming;
  ELSE
    SELECT id INTO promo_upcoming FROM public.promotions WHERE name='Maquillaje 10% (Próxima)' AND organization_id=org;
    UPDATE public.promotions SET is_active=TRUE, start_date=now()+ interval '3 days', end_date=now()+ interval '14 days' WHERE id=promo_upcoming;
  END IF;

  -- Expirada: Verano 20% (para tarjetas de histórico)
  IF NOT EXISTS (SELECT 1 FROM public.promotions WHERE name='Verano 20% (Expirada)' AND organization_id=org) THEN
    INSERT INTO public.promotions (id,name,description,discount_type,discount_value,min_purchase_amount,max_discount_amount,usage_limit,start_date,end_date,is_active,organization_id)
    VALUES (gen_random_uuid()::text,'Verano 20% (Expirada)','Finalizó la semana pasada','PERCENTAGE',20,0,NULL,0, now() - interval '20 days', now() - interval '7 days', FALSE, org)
    RETURNING id INTO promo_expired;
  ELSE
    SELECT id INTO promo_expired FROM public.promotions WHERE name='Verano 20% (Expirada)' AND organization_id=org;
    UPDATE public.promotions SET is_active=FALSE, start_date=now()- interval '20 days', end_date=now()- interval '7 days' WHERE id=promo_expired;
  END IF;

  -- Vincular productos
  IF promo_frag IS NOT NULL THEN
    IF p_frag IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_frag, p_frag, org) ON CONFLICT DO NOTHING; END IF;
    IF p_perf1 IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_frag, p_perf1, org) ON CONFLICT DO NOTHING; END IF;
    IF p_perf2 IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_frag, p_perf2, org) ON CONFLICT DO NOTHING; END IF;
  END IF;

  IF promo_acce IS NOT NULL AND p_brocha IS NOT NULL THEN
    INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_acce, p_brocha, org) ON CONFLICT DO NOTHING;
  END IF;

  IF promo_upcoming IS NOT NULL THEN
    IF p_glitter IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_upcoming, p_glitter, org) ON CONFLICT DO NOTHING; END IF;
    IF p_gel IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_upcoming, p_gel, org) ON CONFLICT DO NOTHING; END IF;
    IF p_labkit IS NOT NULL THEN INSERT INTO public.promotions_products (promotion_id, product_id, organization_id) VALUES (promo_upcoming, p_labkit, org) ON CONFLICT DO NOTHING; END IF;
  END IF;

  -- Agregar una al carrusel si hay espacio
  BEGIN
    IF promo_frag IS NOT NULL THEN
      INSERT INTO public.promotions_carousel (promotion_id, position, organization_id)
      VALUES (promo_frag, 3, org)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    -- El carrusel puede no existir en algunos entornos: ignorar
    NULL;
  END;
END $$;

