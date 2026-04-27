DO $$
DECLARE u UUID; org UUID; p1 TEXT; p3 TEXT; from_branch TEXT; to_branch TEXT;
BEGIN
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  IF u IS NULL OR org IS NULL THEN RETURN; END IF;

  SELECT id INTO from_branch FROM public.branches WHERE organization_id=org AND slug='central';
  SELECT id INTO to_branch FROM public.branches WHERE organization_id=org AND slug='norte';

  SELECT id INTO p1 FROM public.products WHERE sku='JELAB_002' AND organization_id=org;
  SELECT id INTO p3 FROM public.products WHERE sku='JECRE_002' AND organization_id=org;

  -- Transfer 10 units of two products (OUT from central, IN to norte)
  IF p1 IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p1,'TRANSFER',-10,'ADJUSTMENT',from_branch,'Transferencia central -> norte',u,now(),now(),org);
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p1,'TRANSFER',10,'ADJUSTMENT',to_branch,'Transferencia central -> norte',u,now(),now(),org);
  END IF;
  IF p3 IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p3,'TRANSFER',-10,'ADJUSTMENT',from_branch,'Transferencia central -> norte',u,now(),now(),org);
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text,p3,'TRANSFER',10,'ADJUSTMENT',to_branch,'Transferencia central -> norte',u,now(),now(),org);
  END IF;
END $$;

