DO $$
DECLARE
  org UUID; u UUID; central UUID; norte UUID;
  p_perf TEXT; p_brocha TEXT; p_crem TEXT;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  SELECT id INTO u FROM public.users WHERE email='analiak026@gmail.com';

  -- Crear sucursales si no existen
  INSERT INTO public.branches (organization_id, name, slug, address, phone)
  VALUES (org, 'Sucursal Central', 'central', 'Av. Principal 100', '+595991100000')
  ON CONFLICT (organization_id, slug) DO NOTHING;
  INSERT INTO public.branches (organization_id, name, slug, address, phone)
  VALUES (org, 'Sucursal Norte', 'norte', 'Av. Norte 200', '+595991200000')
  ON CONFLICT (organization_id, slug) DO NOTHING;

  SELECT id INTO central FROM public.branches WHERE organization_id=org AND slug='central';
  SELECT id INTO norte   FROM public.branches WHERE organization_id=org AND slug='norte';

  -- Productos a transferir/ajustar
  SELECT id INTO p_perf   FROM public.products WHERE sku='PVPERF_001' AND organization_id=org LIMIT 1;
  SELECT id INTO p_brocha FROM public.products WHERE sku='PVBRSH_001' AND organization_id=org LIMIT 1;
  SELECT id INTO p_crem   FROM public.products WHERE sku='PVCREM_001' AND organization_id=org LIMIT 1;

  -- Transferencia: Central -> Norte (10 unidades por producto si existe)
  IF p_perf IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p_perf,'TRANSFER',-10,'ADJUSTMENT',norte::text,'Transferencia Central -> Norte',u,now(),now(),org,central);
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p_perf,'TRANSFER',10,'ADJUSTMENT',central::text,'Transferencia Central -> Norte',u,now(),now(),org,norte);
  END IF;
  IF p_brocha IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p_brocha,'TRANSFER',-15,'ADJUSTMENT',norte::text,'Transferencia Central -> Norte',u,now(),now(),org,central);
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p_brocha,'TRANSFER',15,'ADJUSTMENT',central::text,'Transferencia Central -> Norte',u,now(),now(),org,norte);
  END IF;

  -- Ajuste de inventario: -5 unidades en Norte por daño (Crema)
  IF p_crem IS NOT NULL AND norte IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id,branch_id)
    VALUES (gen_random_uuid()::text,p_crem,'ADJUSTMENT',-5,'ADJUSTMENT',norte::text,'Ajuste por productos dañados',u,now(),now(),org,norte);
  END IF;
END $$;

