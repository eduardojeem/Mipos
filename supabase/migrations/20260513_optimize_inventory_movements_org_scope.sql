DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;
END $$;

UPDATE public.inventory_movements AS movement
SET organization_id = product.organization_id
FROM public.products AS product
WHERE movement.organization_id IS NULL
  AND product.id = movement.product_id
  AND product.organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_created_at
  ON public.inventory_movements (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_product_created_at
  ON public.inventory_movements (organization_id, product_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'organization_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.inventory_movements
    WHERE organization_id IS NULL
  ) THEN
    ALTER TABLE public.inventory_movements
      ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;
