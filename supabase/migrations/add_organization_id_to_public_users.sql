-- Add organization_id to public.users and enforce FK to public.organizations
-- This aligns Supabase schema with application code expecting per-user organization scoping

BEGIN;

-- Add column as UUID (matches organizations.id type)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Index to optimize filters by organization_id
CREATE INDEX IF NOT EXISTS users_organization_id_idx
  ON public.users(organization_id);

-- Foreign key constraint with safe cascade behavior
DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists; ignore
  NULL;
END $$;

COMMIT;
