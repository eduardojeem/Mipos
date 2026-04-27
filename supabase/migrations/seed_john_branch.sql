DO $$
DECLARE org_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'john-espinoza-org';
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
    VALUES ('Empresa John Espinoza', 'john-espinoza-org', 'PREMIUM', 'ACTIVE')
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO public.branches (organization_id, name, slug, address, phone)
  VALUES (org_id, 'Sucursal Central', 'central', 'Av. Principal 123', '+595991000000')
  ON CONFLICT (organization_id, slug) DO NOTHING;
END $$;

