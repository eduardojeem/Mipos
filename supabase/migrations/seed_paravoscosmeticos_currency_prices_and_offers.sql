DO $$
DECLARE
  v_org uuid;
  v_cfg_exists boolean := false;
  v_cat_ojos text; v_cat_labios text; v_cat_cabello text; v_cat_corporal text; v_cat_frag text; v_cat_acce text;
  promo3_id text; promo4_id text;
  p_ids text[] := ARRAY[]::text[];
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'paravoscosmeticos-1773613448825';
  IF v_org IS NULL THEN RETURN; END IF;

  -- 1) Moneda: establecer PYG en business_config (upsert)
  BEGIN
    PERFORM 1 FROM public.business_config WHERE organization_id = v_org;
    v_cfg_exists := FOUND;
  EXCEPTION WHEN undefined_table THEN
    v_cfg_exists := false;
  END;

  IF v_cfg_exists THEN
    UPDATE public.business_config
    SET currency = 'PYG', updated_at = now()
    WHERE organization_id = v_org;
  ELSE
    BEGIN
      INSERT INTO public.business_config (organization_id, currency, updated_at)
      VALUES (v_org, 'PYG', now());
    EXCEPTION WHEN undefined_table THEN
      -- Si la tabla no existe en este entorno, omitir silenciosamente
      NULL;
    END;
  END IF;

  -- 2) Escalar precios a Guaraníes (multiplicar por 1000 sólo si parecen valores pequeños)
  UPDATE public.products
  SET 
    cost_price = ROUND(CASE WHEN cost_price < 5000 THEN cost_price * 1000 ELSE cost_price END),
    sale_price = ROUND(CASE WHEN sale_price < 5000 THEN sale_price * 1000 ELSE sale_price END),
    updated_at = now()
  WHERE organization_id = v_org;

  -- 3) Asegurar categorías bases
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Maquillaje de Ojos', 'Sombras y delineadores', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Maquillaje de Labios', 'Labiales y gloss', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Cuidado Capilar', 'Shampoos y tratamientos', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Cuidado Corporal', 'Lociones y exfoliantes', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Fragancias', 'Perfumes y colonias', v_org)
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES (gen_random_uuid()::text, 'PV Accesorios', 'Accesorios de belleza', v_org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_cat_ojos FROM public.categories WHERE name='PV Maquillaje de Ojos' AND organization_id=v_org;
  SELECT id INTO v_cat_labios FROM public.categories WHERE name='PV Maquillaje de Labios' AND organization_id=v_org;
  SELECT id INTO v_cat_cabello FROM public.categories WHERE name='PV Cuidado Capilar' AND organization_id=v_org;
  SELECT id INTO v_cat_corporal FROM public.categories WHERE name='PV Cuidado Corporal' AND organization_id=v_org;
  SELECT id INTO v_cat_frag FROM public.categories WHERE name='PV Fragancias' AND organization_id=v_org;
  SELECT id INTO v_cat_acce FROM public.categories WHERE name='PV Accesorios' AND organization_id=v_org;

  -- 4) Nuevos productos con precios en PYG (solo insert si no existen por SKU)
  IF v_cat_labios IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Kit Labial Nude','PVLABKIT_001',v_cat_labios,'Set de labiales nude',35000,89900,40,6,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  IF v_cat_ojos IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Sombras Glitter','PVOJO_004',v_cat_ojos,'Sombras con brillo',25000,59900,70,8,'{}'::text[],TRUE,now(),now(),v_org),
      (gen_random_uuid()::text,'PV Delineador Gel Waterproof','PVOJO_005',v_cat_ojos,'Delineador en gel',18000,49900,80,10,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  IF v_cat_cabello IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Acondicionador Nutritivo','PVCAB_004',v_cat_cabello,'Acondicionador 500ml',20000,44900,60,6,'{}'::text[],TRUE,now(),now(),v_org),
      (gen_random_uuid()::text,'PV Spray Termoprotector','PVCAB_005',v_cat_cabello,'Protege del calor',22000,55900,50,5,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  IF v_cat_corporal IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Crema Corporal Coco','PVCOR_003',v_cat_corporal,'Loción nutritiva',15000,39900,55,8,'{}'::text[],TRUE,now(),now(),v_org),
      (gen_random_uuid()::text,'PV Manteca Corporal Karité','PVCOR_004',v_cat_corporal,'Hidratación intensa',18000,49900,45,6,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  IF v_cat_frag IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Body Splash Vainilla','PVFRAG_003',v_cat_frag,'Body splash dulce',12000,34900,90,10,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  IF v_cat_acce IS NOT NULL THEN
    INSERT INTO public.products (id,name,sku,category_id,description,cost_price,sale_price,stock_quantity,min_stock,images,is_active,created_at,updated_at,organization_id)
    VALUES
      (gen_random_uuid()::text,'PV Set de Brochas 10pzs','PVACCE_002',v_cat_acce,'Juego de brochas profesional',40000,129900,35,5,'{}'::text[],TRUE,now(),now(),v_org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 5) Crear nuevas promociones y vincular a algunos productos
  BEGIN
    INSERT INTO public.promotions (id,name,discount_type,discount_value,start_date,end_date,is_active,organization_id,min_purchase_amount,max_discount_amount,usage_limit)
    VALUES (gen_random_uuid()::text,'Semana de Belleza 10%','PERCENTAGE',10, now(), now() + interval '14 days', TRUE, v_org, 0, 100000, 0)
    RETURNING id INTO promo3_id;
  EXCEPTION WHEN undefined_table THEN
    promo3_id := NULL;
  END;

  BEGIN
    INSERT INTO public.promotions (id,name,discount_type,discount_value,start_date,end_date,is_active,organization_id,min_purchase_amount,max_discount_amount,usage_limit)
    VALUES (gen_random_uuid()::text,'Promo Accesorios -15%','PERCENTAGE',15, now(), now() + interval '10 days', TRUE, v_org, 0, 150000, 0)
    RETURNING id INTO promo4_id;
  EXCEPTION WHEN undefined_table THEN
    promo4_id := NULL;
  END;

  -- vincular por SKU si existen
  p_ids := ARRAY[
    (SELECT id FROM public.products WHERE organization_id=v_org AND sku='PVOJO_004' LIMIT 1),
    (SELECT id FROM public.products WHERE organization_id=v_org AND sku='PVOJO_005' LIMIT 1),
    (SELECT id FROM public.products WHERE organization_id=v_org AND sku='PVACCE_002' LIMIT 1),
    (SELECT id FROM public.products WHERE organization_id=v_org AND sku='PVCOR_003' LIMIT 1)
  ];

  IF promo3_id IS NOT NULL THEN
    INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
    SELECT promo3_id, pid, v_org FROM unnest(p_ids) pid WHERE pid IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  IF promo4_id IS NOT NULL THEN
    INSERT INTO public.promotions_products (promotion_id, product_id, organization_id)
    SELECT promo4_id, pid, v_org FROM unnest(ARRAY[
      (SELECT id FROM public.products WHERE organization_id=v_org AND sku='PVACCE_002' LIMIT 1)
    ]) pid WHERE pid IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
