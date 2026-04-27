DO $$
DECLARE
  org UUID; u UUID; c TEXT;
  p1 TEXT; p2 TEXT; p3 TEXT; sid TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO c FROM public.customers WHERE organization_id=org ORDER BY created_at ASC LIMIT 1;
  IF u IS NULL OR c IS NULL THEN RETURN; END IF;

  -- Intentar registrar cupones si existe la tabla; si no, continuar sin error
  BEGIN
    INSERT INTO public.coupons (code, description, discount_type, discount_value, is_active, start_date, end_date, organization_id)
    VALUES
      ('BIENVENIDA10','10% de bienvenida','PERCENTAGE',10, TRUE, now() - interval '7 days', now() + interval '90 days', org),
      ('SALE20K','Descuento fijo 20.000 Gs','FIXED_AMOUNT',20000, TRUE, now() - interval '7 days', now() + interval '60 days', org)
    ON CONFLICT (code, organization_id) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN
    -- Tabla coupons no existe en este entorno; ignorar
    NULL;
  END;

  -- Productos base para ítems
  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='PVBASE_001' LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p3 FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;
  IF p1 IS NULL THEN SELECT id INTO p1 FROM public.products WHERE organization_id=org LIMIT 1; END IF;

  -- Venta con cupón BIENVENIDA10 (10%)
  IF p2 IS NOT NULL THEN
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,c,180000,10,'PERCENTAGE',0,162000, now() - interval '20 minutes','CARD','COMPLETED','Venta con cupón BIENVENIDA10 (10%)', now() - interval '20 minutes', now() - interval '20 minutes', org)
    RETURNING id INTO sid;
    IF sid IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p2,1,180000);
    END IF;
  END IF;

  -- Venta con cupón SALE20K (monto fijo 20.000)
  IF p3 IS NOT NULL THEN
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,c,150000,20000,'FIXED_AMOUNT',0,130000, now() - interval '50 minutes','CASH','COMPLETED','Venta con cupón SALE20K (20.000 Gs)', now() - interval '50 minutes', now() - interval '50 minutes', org)
    RETURNING id INTO sid;
    IF sid IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p3,1,150000);
    END IF;
  END IF;

  -- Venta con descuento manual sin cupón (5%)
  IF p1 IS NOT NULL THEN
    INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,u,c,100000,5,'PERCENTAGE',0,95000, now() - interval '80 minutes','TRANSFER','COMPLETED','Descuento manual 5%', now() - interval '80 minutes', now() - interval '80 minutes', org)
    RETURNING id INTO sid;
    IF sid IS NOT NULL THEN
      INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,sid,p1,1,100000);
    END IF;
  END IF;
END $$;
