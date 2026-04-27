DO $$
DECLARE org UUID; norte UUID; u UUID; p1 TEXT; p3 TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  SELECT id INTO norte FROM public.branches WHERE organization_id=org AND slug='norte';
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  IF org IS NULL OR norte IS NULL OR u IS NULL THEN RETURN; END IF;
  SELECT id INTO p1 FROM public.products WHERE organization_id=org AND sku='JELAB_002';
  SELECT id INTO p3 FROM public.products WHERE organization_id=org AND sku='JECRE_002';
  IF p1 IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p1,'ADJUSTMENT',20,'ADJUSTMENT',norte::text,'Stock inicial norte',u,now(),now(),org,norte);
  END IF;
  IF p3 IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p3,'ADJUSTMENT',15,'ADJUSTMENT',norte::text,'Stock inicial norte',u,now(),now(),org,norte);
  END IF;
END $$;

