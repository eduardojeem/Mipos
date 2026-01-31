-- Seed de productos para la organización de John (john-espinoza-org)
-- Idempotente: crea categorías propias y productos con SKUs únicos

DO $$
DECLARE
  org_slug TEXT := 'john-espinoza-org';
  org_id UUID;
  cat_face TEXT; -- id categoría Cuidado Facial
  cat_makeup TEXT; -- id categoría Maquillaje
  cat_hair TEXT; -- id categoría Cabello
BEGIN
  -- Obtener id de la organización
  SELECT id INTO org_id FROM public.organizations WHERE slug = org_slug LIMIT 1;
  IF org_id IS NULL THEN
    RAISE NOTICE 'Organización % no encontrada. Crea primero la organización.', org_slug;
    RETURN;
  END IF;

  -- Crear categorías específicas para evitar conflictos globales por nombre único
  -- Cuidado Facial
  IF NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'John - Cuidado Facial'
  ) THEN
    INSERT INTO public.categories (id, name, description, organization_id, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'John - Cuidado Facial', 'Productos para cuidado facial', org_id, NOW(), NOW())
    RETURNING id INTO cat_face;
  ELSE
    SELECT id INTO cat_face FROM public.categories WHERE name = 'John - Cuidado Facial' LIMIT 1;
    -- Alinear organización si estuviera vacía (solo si coincide)
    UPDATE public.categories SET organization_id = org_id WHERE id = cat_face AND (organization_id IS NULL OR organization_id <> org_id);
  END IF;

  -- Maquillaje
  IF NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'John - Maquillaje'
  ) THEN
    INSERT INTO public.categories (id, name, description, organization_id, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'John - Maquillaje', 'Productos de maquillaje', org_id, NOW(), NOW())
    RETURNING id INTO cat_makeup;
  ELSE
    SELECT id INTO cat_makeup FROM public.categories WHERE name = 'John - Maquillaje' LIMIT 1;
    UPDATE public.categories SET organization_id = org_id WHERE id = cat_makeup AND (organization_id IS NULL OR organization_id <> org_id);
  END IF;

  -- Cabello
  IF NOT EXISTS (
    SELECT 1 FROM public.categories WHERE name = 'John - Cabello'
  ) THEN
    INSERT INTO public.categories (id, name, description, organization_id, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'John - Cabello', 'Productos para el cabello', org_id, NOW(), NOW())
    RETURNING id INTO cat_hair;
  ELSE
    SELECT id INTO cat_hair FROM public.categories WHERE name = 'John - Cabello' LIMIT 1;
    UPDATE public.categories SET organization_id = org_id WHERE id = cat_hair AND (organization_id IS NULL OR organization_id <> org_id);
  END IF;

  -- Insertar productos (únicos por SKU)
  -- Cuidado Facial
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Gel limpiador facial', 'JHN-FACE-001', cat_face, 'Gel limpiador suave para uso diario', 25.00, 49.90, 120, 10, ARRAY['https://picsum.photos/seed/jhn-face-001/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-FACE-001' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Crema hidratante diaria', 'JHN-FACE-002', cat_face, 'Hidratación prolongada con ácido hialurónico', 35.00, 69.90, 80, 8, ARRAY['https://picsum.photos/seed/jhn-face-002/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-FACE-002' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Serum vitamina C 10%', 'JHN-FACE-003', cat_face, 'Serum antioxidante para luminosidad', 45.00, 99.90, 60, 6, ARRAY['https://picsum.photos/seed/jhn-face-003/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-FACE-003' AND organization_id = org_id);

  -- Maquillaje
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Base líquida cobertura media', 'JHN-MKP-001', cat_makeup, 'Acabado natural, tonos neutros', 40.00, 89.90, 150, 12, ARRAY['https://picsum.photos/seed/jhn-mkp-001/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-MKP-001' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Labial mate larga duración', 'JHN-MKP-002', cat_makeup, 'Textura suave, alta pigmentación', 22.00, 49.90, 200, 15, ARRAY['https://picsum.photos/seed/jhn-mkp-002/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-MKP-002' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Máscara de pestañas volumen', 'JHN-MKP-003', cat_makeup, 'Fórmula resistente al agua', 18.00, 39.90, 180, 15, ARRAY['https://picsum.photos/seed/jhn-mkp-003/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-MKP-003' AND organization_id = org_id);

  -- Cabello
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Shampoo nutritivo', 'JHN-HAIR-001', cat_hair, 'Con aceite de argán, para cabello seco', 15.00, 34.90, 140, 10, ARRAY['https://picsum.photos/seed/jhn-hair-001/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-HAIR-001' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Acondicionador reparador', 'JHN-HAIR-002', cat_hair, 'Reparación intensa para puntas abiertas', 16.00, 36.90, 130, 10, ARRAY['https://picsum.photos/seed/jhn-hair-002/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-HAIR-002' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Aceite capilar brillo', 'JHN-HAIR-003', cat_hair, 'Acabado brillante y anti-frizz', 20.00, 44.90, 90, 8, ARRAY['https://picsum.photos/seed/jhn-hair-003/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-HAIR-003' AND organization_id = org_id);

  -- Extras
  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Crema de manos karité', 'JHN-FACE-004', cat_face, 'Nutrición y suavidad para manos', 12.00, 24.90, 160, 12, ARRAY['https://picsum.photos/seed/jhn-face-004/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-FACE-004' AND organization_id = org_id);

  INSERT INTO public.products (id, name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock, images, organization_id, created_at, updated_at)
  SELECT gen_random_uuid()::text, 'Tónico facial calmante', 'JHN-FACE-005', cat_face, 'Equilibra y calma la piel sensible', 14.00, 29.90, 110, 9, ARRAY['https://picsum.photos/seed/jhn-face-005/600/400'], org_id, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE sku = 'JHN-FACE-005' AND organization_id = org_id);

  RAISE NOTICE 'Seed de productos para organización % aplicado.', org_slug;
END $$;

