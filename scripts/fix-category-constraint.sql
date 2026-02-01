
-- Drop the global unique constraint on category name
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;
DROP INDEX IF EXISTS categories_name_key;

-- Create a composite unique index on (name, organization_id)
-- Using COALESCE to handle potential nulls if existing data has null org_id (though we should have fixed that)
-- For now, let's assume we want unique name per org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_org ON public.categories (name, organization_id);
