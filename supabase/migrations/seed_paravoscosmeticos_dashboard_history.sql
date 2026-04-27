DO $$
DECLARE
  org UUID; u UUID; c TEXT;
  p1 TEXT; p2 TEXT; p3 TEXT; p4 TEXT;
  i INT;
  s_id TEXT;
  ts TIMESTAMPTZ;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO c FROM public.customers WHERE organization_id=org ORDER BY created_at ASC LIMIT 1;

  -- Usar algunos productos conocidos
  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='PVBASE_001' LIMIT 1;
  SELECT id INTO p2 FROM public.products WHERE organization_id=org AND sku='PVCREM_001' LIMIT 1;
  SELECT id INTO p3 FROM public.products WHERE organization_id=org AND sku='PVOJO_004' LIMIT 1;
  SELECT id INTO p4 FROM public.products WHERE organization_id=org AND sku='PVLABKIT_001' LIMIT 1;

  IF u IS NULL OR c IS NULL THEN RETURN; END IF;

  FOR i IN 1..14 LOOP
    -- Timestamp distribuido en el día i (usar intervalos simples por compatibilidad)
    ts := now() - (i || ' days')::interval - ((i * 3 % 24) || ' hours')::interval - ((i * 7 % 60) || ' minutes')::interval;

    -- Monto base variando por día
    -- Alternamos productos para variedad
    IF (i % 4) = 0 AND p4 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,160000,0,'FIXED_AMOUNT',0,160000, ts,'CARD','COMPLETED','Histórico demo', ts, ts, org)
      RETURNING id INTO s_id;
      IF s_id IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,s_id,p4,1,160000);
      END IF;
    ELSIF (i % 3) = 0 AND p3 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,110000,0,'FIXED_AMOUNT',0,110000, ts,'CASH','COMPLETED','Histórico demo', ts, ts, org)
      RETURNING id INTO s_id;
      IF s_id IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,s_id,p3,1,110000);
      END IF;
    ELSIF (i % 2) = 0 AND p2 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,90000,0,'FIXED_AMOUNT',0,90000, ts,'TRANSFER','COMPLETED','Histórico demo', ts, ts, org)
      RETURNING id INTO s_id;
      IF s_id IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,s_id,p2,1,90000);
      END IF;
    ELSIF p1 IS NOT NULL THEN
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,145000,0,'FIXED_AMOUNT',0,145000, ts,'CARD','COMPLETED','Histórico demo', ts, ts, org)
      RETURNING id INTO s_id;
      IF s_id IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,s_id,p1,1,145000);
      END IF;
    END IF;

    -- Agregar algunos pedidos entregados (DELIVERED) para analytics
    IF (i % 5) = 0 AND p1 IS NOT NULL THEN
      ts := ts + interval '2 hours';
      INSERT INTO public.sales (id,user_id,customer_id,subtotal,discount,discount_type,tax,total,date,payment_method,status,notes,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text,u,c,130000,0,'FIXED_AMOUNT',0,130000, ts,'CARD','DELIVERED','Histórico entregado', ts, ts, org)
      RETURNING id INTO s_id;
      IF s_id IS NOT NULL THEN
        INSERT INTO public.sale_items (id,sale_id,product_id,quantity,unit_price) VALUES (gen_random_uuid()::text,s_id,p1,1,130000);
      END IF;
    END IF;
  END LOOP;
END $$;
