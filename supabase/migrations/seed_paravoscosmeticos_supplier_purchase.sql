DO $$
DECLARE
  u UUID; org UUID; sup TEXT; p_base TEXT; p_crem TEXT; p_perf TEXT; p_brocha TEXT;
  pur TEXT; pi1 TEXT; pi2 TEXT; pi3 TEXT; pi4 TEXT;
BEGIN
  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF u IS NULL OR org IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name='PV Distribuidora' AND organization_id=org) THEN
    INSERT INTO public.suppliers (id,name,contact_info,organization_id)
    VALUES (gen_random_uuid()::text,'PV Distribuidora','{"email":"proveedor@paravos.com","phone":"+595981200000"}',org);
  END IF;
  SELECT id INTO sup FROM public.suppliers WHERE name='PV Distribuidora' AND organization_id=org;

  SELECT id INTO p_base   FROM public.products WHERE sku='PVBASE_001'  AND organization_id=org;
  SELECT id INTO p_crem   FROM public.products WHERE sku='PVCREM_001'  AND organization_id=org;
  SELECT id INTO p_perf   FROM public.products WHERE sku='PVPERF_001'  AND organization_id=org;
  SELECT id INTO p_brocha FROM public.products WHERE sku='PVBRSH_001'  AND organization_id=org;

  -- Crear una compra de reposición
  INSERT INTO public.purchases (id,supplier_id,user_id,total,date,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,sup,u, (100*30 + 80*18 + 60*30 + 120*8), now()-interval '2 days', now(), now(), org)
  RETURNING id INTO pur;

  -- Detalle de compra
  IF p_base IS NOT NULL THEN
    INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
    VALUES (gen_random_uuid()::text,pur,p_base,80,18) RETURNING id INTO pi1;
  END IF;
  IF p_crem IS NOT NULL THEN
    INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
    VALUES (gen_random_uuid()::text,pur,p_crem,60,30) RETURNING id INTO pi2;
  END IF;
  IF p_perf IS NOT NULL THEN
    INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
    VALUES (gen_random_uuid()::text,pur,p_perf,100,30) RETURNING id INTO pi3;
  END IF;
  IF p_brocha IS NOT NULL THEN
    INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
    VALUES (gen_random_uuid()::text,pur,p_brocha,120,8) RETURNING id INTO pi4;
  END IF;

  -- Movimientos de inventario por la compra
  IF p_base IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p_base,'IN',80,'PURCHASE',pur,'Reposición por compra',u,now()-interval '2 days',now()-interval '2 days',org);
  END IF;
  IF p_crem IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p_crem,'IN',60,'PURCHASE',pur,'Reposición por compra',u,now()-interval '2 days',now()-interval '2 days',org);
  END IF;
  IF p_perf IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p_perf,'IN',100,'PURCHASE',pur,'Reposición por compra',u,now()-interval '2 days',now()-interval '2 days',org);
  END IF;
  IF p_brocha IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p_brocha,'IN',120,'PURCHASE',pur,'Reposición por compra',u,now()-interval '2 days',now()-interval '2 days',org);
  END IF;
END $$;
