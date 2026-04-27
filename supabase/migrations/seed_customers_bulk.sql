DO $$
DECLARE
  v_email text := 'johneduardoespinoza95@gmail.com';
  v_user_id uuid;
  v_org_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(v_email);
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE user_id = v_user_id LIMIT 1;
  IF v_org_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Juan Pérez') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Juan Pérez', NULL, '099111111', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Maria Gómez') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Maria Gómez', NULL, '099222222', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Carlos López') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Carlos López', NULL, '099333333', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Ana Torres') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Ana Torres', NULL, '099444444', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Luis Fernández') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Luis Fernández', NULL, '0981555555', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Sofía Martínez') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Sofía Martínez', NULL, '0972666666', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Pedro Rivas') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Pedro Rivas', NULL, '0963777777', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Laura Díaz') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Laura Díaz', NULL, '0981888888', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Jorge Benítez') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Jorge Benítez', NULL, '0972999999', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Valeria Núñez') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Valeria Núñez', NULL, '0953000000', v_org_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE organization_id = v_org_id AND name = 'Diego Castro') THEN
    INSERT INTO public.customers (name, email, phone, organization_id) VALUES ('Diego Castro', NULL, '0993111111', v_org_id);
  END IF;
END $$;
