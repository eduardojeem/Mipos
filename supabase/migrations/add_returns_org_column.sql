-- Añade organization_id a returns y realiza backfill desde sales
-- También asegura helpers de multitenancy

-- 1) Crear columna si falta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'returns' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.returns ADD COLUMN organization_id UUID;
  END IF;
END $$;

-- 2) Backfill: tomar organization_id desde la venta original
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sales' AND column_name='organization_id'
  ) THEN
    UPDATE public.returns r
    SET organization_id = s.organization_id
    FROM public.sales s
    WHERE r.original_sale_id = s.id
      AND r.organization_id IS NULL;
  END IF;
END $$;

-- 3) Backfill restante con una organización por defecto (si existe)
DO $$
DECLARE default_org UUID;
DECLARE org_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='organizations'
  ) INTO org_table_exists;

  IF org_table_exists THEN
    SELECT id INTO default_org FROM public.organizations LIMIT 1;
  ELSE
    SELECT gen_random_uuid() INTO default_org;
  END IF;

  IF default_org IS NOT NULL THEN
    UPDATE public.returns SET organization_id = default_org WHERE organization_id IS NULL;
  END IF;
END $$;

-- 4) NOT NULL y índice
ALTER TABLE public.returns ALTER COLUMN organization_id SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='returns' AND indexname='idx_returns_organization_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_returns_organization_id ON public.returns(organization_id)';
  END IF;
END $$;

-- 5) Helpers de multitenancy (asegurar existencia)
-- get_my_org_ids
CREATE OR REPLACE FUNCTION get_my_org_ids() RETURNS UUID[] AS $$
DECLARE exists_org_members BOOLEAN; result UUID[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='organization_members'
  ) INTO exists_org_members;

  IF exists_org_members THEN
    SELECT array_agg(organization_id) INTO result
    FROM public.organization_members
    WHERE user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  ELSE
    RETURN ARRAY[]::UUID[];
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION belongs_to_org(org_id UUID) RETURNS BOOLEAN AS $$
DECLARE exists_org_members BOOLEAN; exists_belong BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='organization_members'
  ) INTO exists_org_members;

  IF exists_org_members THEN
    SELECT EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() AND organization_id = org_id
    ) INTO exists_belong;
    RETURN exists_belong;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
