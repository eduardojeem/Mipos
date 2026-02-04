BEGIN;

-- Add owner_id column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Add foreign key to public.users(id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_owner_id_fkey'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END$$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);

-- Backfill owner_id from organization_members where is_owner = true
UPDATE public.organizations o
SET owner_id = om.user_id
FROM public.organization_members om
WHERE om.organization_id = o.id
  AND om.is_owner = true
  AND o.owner_id IS NULL;

-- Fallback: if still null, pick earliest member
WITH first_member AS (
  SELECT DISTINCT ON (organization_id)
    organization_id, user_id
  FROM public.organization_members
  ORDER BY organization_id, created_at ASC
)
UPDATE public.organizations o
SET owner_id = fm.user_id
FROM first_member fm
WHERE fm.organization_id = o.id
  AND o.owner_id IS NULL;

COMMIT;

