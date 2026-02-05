-- Add multitenancy and missing columns to business_config
ALTER TABLE public.business_config
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS enable_inventory_tracking BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true;

-- Unique per organization (ignore rows where organization_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_config_unique_org
  ON public.business_config(organization_id)
  WHERE organization_id IS NOT NULL;

-- Optional backfill: keep existing rows as unassigned (NULL) to avoid incorrect org mapping.
-- You may set organization_id for existing rows manually later if needed.

