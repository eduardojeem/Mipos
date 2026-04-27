DO $$
DECLARE u UUID; org UUID; s1 TEXT; s2 TEXT; p1 TEXT; p2 TEXT; p3 TEXT; p4 TEXT; pur1 TEXT; pur2 TEXT; pi1 TEXT; pi2 TEXT; pi3 TEXT; pi4 TEXT;
BEGIN
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  IF u IS NULL OR org IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name='Proveedor JE 1' AND organization_id=org) THEN
    INSERT INTO public.suppliers (id,name,contact_info,organization_id)
    VALUES (gen_random_uuid()::text,'Proveedor JE 1','{"email":"prov.je1@example.com"}',org);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE name='Proveedor JE 2' AND organization_id=org) THEN
    INSERT INTO public.suppliers (id,name,contact_info,organization_id)
    VALUES (gen_random_uuid()::text,'Proveedor JE 2','{"email":"prov.je2@example.com"}',org);
  END IF;
  SELECT id INTO s1 FROM public.suppliers WHERE name='Proveedor JE 1' AND organization_id=org;
  SELECT id INTO s2 FROM public.suppliers WHERE name='Proveedor JE 2' AND organization_id=org;

  SELECT id INTO p1 FROM public.products WHERE sku='JELAB_002' AND organization_id=org;
  SELECT id INTO p2 FROM public.products WHERE sku='JELIN_001' AND organization_id=org;
  SELECT id INTO p3 FROM public.products WHERE sku='JECRE_002' AND organization_id=org;
  SELECT id INTO p4 FROM public.products WHERE sku='JESER_002' AND organization_id=org;

  INSERT INTO public.purchases (id,supplier_id,user_id,total,date,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,s1,u,260,now()-interval '5 days',now(),now(),org)
  RETURNING id INTO pur1;
  INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
  VALUES (gen_random_uuid()::text,pur1,p1,100,20);
  INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
  VALUES (gen_random_uuid()::text,pur1,p2,200,12);

  INSERT INTO public.purchases (id,supplier_id,user_id,total,date,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,s2,u,284,now()-interval '1 days',now(),now(),org)
  RETURNING id INTO pur2;
  INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
  VALUES (gen_random_uuid()::text,pur2,p3,90,25);
  INSERT INTO public.purchase_items (id,purchase_id,product_id,quantity,unit_cost)
  VALUES (gen_random_uuid()::text,pur2,p4,110,22);

  INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,p1,'IN',100,'PURCHASE',pur1,'Reposición',u,now()-interval '5 days',now()-interval '5 days',org);
  INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,p2,'IN',200,'PURCHASE',pur1,'Reposición',u,now()-interval '5 days',now()-interval '5 days',org);
  INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,p3,'IN',90,'PURCHASE',pur2,'Reposición',u,now()-interval '1 days',now()-interval '1 days',org);
  INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
  VALUES (gen_random_uuid()::text,p4,'IN',110,'PURCHASE',pur2,'Reposición',u,now()-interval '1 days',now()-interval '1 days',org);
END $$;
