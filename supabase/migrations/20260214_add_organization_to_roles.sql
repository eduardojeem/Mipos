BEGIN;

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_roles_organization'
      AND conrelid = 'public.roles'::regclass
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT fk_roles_organization
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_roles_organization_id
  ON public.roles (organization_id);

COMMIT;
