DO $$
DECLARE
  org UUID;
  cat_ojos TEXT;
  cat_labios TEXT;
  cat_cabello TEXT;
  cat_corporal TEXT;
BEGIN
  -- Buscar la organización
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  -- 1. Insertar más categorías
  INSERT INTO public.categories (id, name, description, organization_id)
  VALUES 
    (gen_random_uuid()::text, 'PV Maquillaje de Ojos', 'Sombras, delineadores y máscaras', org),
    (gen_random_uuid()::text, 'PV Maquillaje de Labios', 'Labiales, gloss y delineadores', org),
    (gen_random_uuid()::text, 'PV Cuidado Capilar', 'Shampoos, mascarillas y aceites', org),
    (gen_random_uuid()::text, 'PV Cuidado Corporal', 'Cremas corporales y lociones', org)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO cat_ojos FROM public.categories WHERE name = 'PV Maquillaje de Ojos' AND organization_id = org;
  SELECT id INTO cat_labios FROM public.categories WHERE name = 'PV Maquillaje de Labios' AND organization_id = org;
  SELECT id INTO cat_cabello FROM public.categories WHERE name = 'PV Cuidado Capilar' AND organization_id = org;
  SELECT id INTO cat_corporal FROM public.categories WHERE name = 'PV Cuidado Corporal' AND organization_id = org;

  -- 2. Insertar productos de ejemplo
  -- Ojos
  IF cat_ojos IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id)
    VALUES 
      (gen_random_uuid()::text, 'PV Paleta de Sombras Neutras', 'PVOJO_001', cat_ojos, 'Paleta de 12 tonos neutros', 15, 35, 40, 5, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Delineador Líquido Negro', 'PVOJO_002', cat_ojos, 'Delineador a prueba de agua', 5, 12, 100, 10, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Máscara Volumen Extremo', 'PVOJO_003', cat_ojos, 'Máscara de pestañas negra', 8, 18, 80, 10, '{}'::text[], org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Labios
  IF cat_labios IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id)
    VALUES 
      (gen_random_uuid()::text, 'PV Labial Mate Rojo', 'PVLAB_001', cat_labios, 'Labial líquido mate larga duración', 7, 16, 60, 8, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Gloss Transparente', 'PVLAB_002', cat_labios, 'Brillo labial hidratante', 6, 14, 75, 10, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Bálsamo Reparador', 'PVLAB_003', cat_labios, 'Bálsamo con manteca de karité', 4, 10, 120, 15, '{}'::text[], org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Cabello
  IF cat_cabello IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id)
    VALUES 
      (gen_random_uuid()::text, 'PV Shampoo Sin Sulfatos', 'PVCAB_001', cat_cabello, 'Shampoo reparador 500ml', 12, 24, 50, 5, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Aceite de Argán', 'PVCAB_002', cat_cabello, 'Sérum capilar hidratante', 10, 22, 45, 5, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Mascarilla Intensiva', 'PVCAB_003', cat_cabello, 'Tratamiento capilar profundo', 14, 28, 30, 4, '{}'::text[], org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- Corporal
  IF cat_corporal IS NOT NULL THEN
    INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id)
    VALUES 
      (gen_random_uuid()::text, 'PV Crema Corporal Vainilla', 'PVCOR_001', cat_corporal, 'Loción hidratante 400ml', 10, 20, 60, 10, '{}'::text[], org),
      (gen_random_uuid()::text, 'PV Exfoliante de Café', 'PVCOR_002', cat_corporal, 'Exfoliante corporal natural', 8, 18, 40, 5, '{}'::text[], org)
    ON CONFLICT (sku) DO NOTHING;
  END IF;

  -- 3. Insertar más clientes de ejemplo (sin email temporalmente por constraint de regex estricto)
  INSERT INTO public.customers (id, name, phone, email, organization_id)
  VALUES 
    (gen_random_uuid()::text, 'Lucía Fernández', '+595981000012', NULL, org),
    (gen_random_uuid()::text, 'Camila Gómez', '+595981000013', NULL, org),
    (gen_random_uuid()::text, 'Sofía Ramírez', '+595981000014', NULL, org),
    (gen_random_uuid()::text, 'Martina Torres', '+595981000015', NULL, org),
    (gen_random_uuid()::text, 'Valentina Ruiz', '+595981000016', NULL, org)
  ON CONFLICT DO NOTHING; -- Evitar duplicados

END $$;
