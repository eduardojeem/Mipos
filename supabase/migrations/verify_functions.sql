DO $$
DECLARE any_org UUID; org_table_exists BOOLEAN;
BEGIN
  PERFORM get_my_org_ids();
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='organizations'
  ) INTO org_table_exists;

  IF org_table_exists THEN
    SELECT id INTO any_org FROM public.organizations LIMIT 1;
    IF any_org IS NOT NULL THEN
      PERFORM belongs_to_org(any_org);
    END IF;
  END IF;
END $$;
