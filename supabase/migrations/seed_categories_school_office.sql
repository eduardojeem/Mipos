BEGIN;

DO $$
DECLARE
  oporg UUID := NULL;
BEGIN
  SELECT id INTO oporg FROM public.organizations LIMIT 1;
  IF oporg IS NULL THEN
    RAISE NOTICE 'No organization found; categories will be global by unique name';
  END IF;

  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Escolar', 'Útiles y papelería escolar', oporg)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Oficina', 'Equipos y suministros de oficina', oporg)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Regalos', 'Artículos de regalo y accesorios', oporg)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.categories (name, description, organization_id)
  VALUES ('Juguetes', 'Juguetes y entretenimiento', oporg)
  ON CONFLICT (name) DO NOTHING;
END $$;

COMMIT;
