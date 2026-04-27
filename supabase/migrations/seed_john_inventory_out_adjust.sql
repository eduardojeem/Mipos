DO $$
DECLARE u UUID; org UUID; rec RECORD; p_adj TEXT;
BEGIN
  SELECT id INTO u FROM public.users WHERE email='johneduardoespinoza95@gmail.com';
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  IF u IS NULL OR org IS NULL THEN RETURN; END IF;

  FOR rec IN
    SELECT si.product_id, si.quantity, s.id AS sale_id, s.date AS sale_date
    FROM public.sale_items si
    JOIN public.sales s ON si.sale_id = s.id
    WHERE s.organization_id = org
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_movements
      WHERE reference_type='SALE' AND reference_id=rec.sale_id AND product_id=rec.product_id
    ) THEN
      INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
      VALUES (gen_random_uuid()::text, rec.product_id, 'OUT', -rec.quantity, 'SALE', rec.sale_id, 'Salida por venta', u, rec.sale_date, rec.sale_date, org);
    END IF;
  END LOOP;

  SELECT id INTO p_adj FROM public.products WHERE sku='JELIN_001' AND organization_id=org;
  IF p_adj IS NOT NULL THEN
    INSERT INTO public.inventory_movements (id,product_id,movement_type,quantity,reference_type,reference_id,notes,user_id,created_at,updated_at,organization_id)
    VALUES (gen_random_uuid()::text, p_adj, 'ADJUSTMENT', 15, 'ADJUSTMENT', NULL, 'Ajuste de stock por inventario', u, now(), now(), org);
  END IF;
END $$;

