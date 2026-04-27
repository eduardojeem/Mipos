DO $$
DECLARE org_id UUID;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE slug = 'john-espinoza-org';
  IF org_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.branches (organization_id, name, slug, address, phone)
  VALUES (org_id, 'Sucursal Norte', 'norte', 'Av. Norte 456', '+595992000000')
  ON CONFLICT (organization_id, slug) DO NOTHING;
END $$;

