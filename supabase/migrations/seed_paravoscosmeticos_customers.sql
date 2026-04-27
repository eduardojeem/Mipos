DO $$
DECLARE
  org UUID;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='paravoscosmeticos-1773613448825';
  IF org IS NULL THEN RETURN; END IF;

  -- Insertar clientes minoristas
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Ana López') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Ana López', '+595981100101', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Bruno Martínez') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Bruno Martínez', '+595981100102', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Carla Núñez') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Carla Núñez', '+595981100103', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Diego Rojas') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Diego Rojas', '+595981100104', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Elena Benítez') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Elena Benítez', '+595981100105', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Fernando Díaz') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Fernando Díaz', '+595981100106', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Gabriela Riveros') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Gabriela Riveros', '+595981100107', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Hugo Cabrera') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Hugo Cabrera', '+595981100108', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Inés Sánchez') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Inés Sánchez', '+595981100109', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Jorge Acosta') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Jorge Acosta', '+595981100110', NULL, now(), now(), org);
  END IF;

  -- Clientes mayoristas (para probar escenarios B2B)
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Boutique Rosé') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Boutique Rosé', '+595981200201', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Perfumería Central') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Perfumería Central', '+595981200202', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Spa Elegance') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Spa Elegance', '+595981200203', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Distribuidora Bella') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Distribuidora Bella', '+595981200204', NULL, now(), now(), org);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id=org AND name='Estética Glam') THEN
    INSERT INTO public.customers (id, name, phone, email, created_at, updated_at, organization_id)
    VALUES (gen_random_uuid()::text, 'Estética Glam', '+595981200205', NULL, now(), now(), org);
  END IF;
END $$;

