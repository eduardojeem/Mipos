ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'PRODUCT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promotions_target_type_check'
  ) THEN
    ALTER TABLE public.promotions
      ADD CONSTRAINT promotions_target_type_check
      CHECK (target_type IN ('PRODUCT', 'SERVICE'));
  END IF;
END $$;

UPDATE public.promotions
SET target_type = 'PRODUCT'
WHERE target_type IS NULL OR target_type = '';

DO $$
DECLARE
  promotions_id_type TEXT;
  services_id_type TEXT;
  organizations_id_type TEXT;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod)
  INTO promotions_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'promotions'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO services_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'services'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod)
  INTO organizations_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'organizations'
    AND a.attname = 'id'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.promotions_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      promotion_id %s NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
      service_id %s NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
      organization_id %s NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )',
    promotions_id_type,
    services_id_type,
    organizations_id_type
  );
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_promotions_services_unique
  ON public.promotions_services (promotion_id, service_id);

CREATE INDEX IF NOT EXISTS idx_promotions_services_promotion_id
  ON public.promotions_services (promotion_id);

CREATE INDEX IF NOT EXISTS idx_promotions_services_service_id
  ON public.promotions_services (service_id);

CREATE INDEX IF NOT EXISTS idx_promotions_services_organization_id
  ON public.promotions_services (organization_id);

ALTER TABLE public.promotions_services ENABLE ROW LEVEL SECURITY;
