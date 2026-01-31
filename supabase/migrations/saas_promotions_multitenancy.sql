-- Multi-tenant para promociones
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: obtener organización por defecto
DO $$
DECLARE default_org UUID;
BEGIN
  SELECT id INTO default_org FROM public.organizations LIMIT 1;
  -- 1) Añadir organization_id a promotions
  ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  IF default_org IS NOT NULL THEN
    UPDATE public.promotions SET organization_id = default_org WHERE organization_id IS NULL;
  END IF;
  ALTER TABLE public.promotions ALTER COLUMN organization_id SET NOT NULL;

  -- Índice
  CREATE INDEX IF NOT EXISTS idx_promotions_org ON public.promotions(organization_id);

  -- 2) Añadir organization_id a promotions_products
  ALTER TABLE public.promotions_products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  UPDATE public.promotions_products pp
    SET organization_id = p.organization_id
    FROM public.promotions p
    WHERE pp.promotion_id = p.id AND pp.organization_id IS NULL;
  ALTER TABLE public.promotions_products ALTER COLUMN organization_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_promotions_products_org ON public.promotions_products(organization_id);

  -- 3) Añadir organization_id a promotions_carousel
  ALTER TABLE public.promotions_carousel ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
  UPDATE public.promotions_carousel pc
    SET organization_id = p.organization_id
    FROM public.promotions p
    WHERE pc.promotion_id = p.id AND pc.organization_id IS NULL;
  ALTER TABLE public.promotions_carousel ALTER COLUMN organization_id SET NOT NULL;
  -- Cambiar índice único a por organización
  DROP INDEX IF EXISTS idx_promotions_carousel_position;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_carousel_org_position ON public.promotions_carousel(organization_id, position);

  -- 4) RLS por tenant
  ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.promotions_products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.promotions_carousel ENABLE ROW LEVEL SECURITY;

  -- Usar helpers get_my_org_ids()/belongs_to_org si existen
  -- Lectura
  DROP POLICY IF EXISTS promotions_read_tenant ON public.promotions;
  CREATE POLICY promotions_read_tenant ON public.promotions
    FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

  DROP POLICY IF EXISTS promotions_products_read_tenant ON public.promotions_products;
  CREATE POLICY promotions_products_read_tenant ON public.promotions_products
    FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

  DROP POLICY IF EXISTS promotions_carousel_read_tenant ON public.promotions_carousel;
  CREATE POLICY promotions_carousel_read_tenant ON public.promotions_carousel
    FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

  -- Escritura
  DROP POLICY IF EXISTS promotions_write_tenant ON public.promotions;
  CREATE POLICY promotions_write_tenant ON public.promotions
    FOR ALL USING (belongs_to_org(organization_id)) WITH CHECK (belongs_to_org(organization_id));

  DROP POLICY IF EXISTS promotions_products_write_tenant ON public.promotions_products;
  CREATE POLICY promotions_products_write_tenant ON public.promotions_products
    FOR ALL USING (belongs_to_org(organization_id)) WITH CHECK (belongs_to_org(organization_id));

  DROP POLICY IF EXISTS promotions_carousel_write_tenant ON public.promotions_carousel;
  CREATE POLICY promotions_carousel_write_tenant ON public.promotions_carousel
    FOR ALL USING (belongs_to_org(organization_id)) WITH CHECK (belongs_to_org(organization_id));

  -- Refrescar esquema
  NOTIFY pgrst, 'reload schema';
END $$;

