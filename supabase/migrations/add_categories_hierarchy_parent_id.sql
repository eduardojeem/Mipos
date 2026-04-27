ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id TEXT NULL;

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_parent_not_self;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_not_self
  CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX IF NOT EXISTS categories_org_parent_idx
  ON public.categories (organization_id, parent_id);

NOTIFY pgrst, 'reload schema';

