CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS branches_read ON public.branches;
CREATE POLICY branches_read ON public.branches
  FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS branches_write ON public.branches;
CREATE POLICY branches_write ON public.branches
  FOR ALL USING (belongs_to_org(organization_id)) WITH CHECK (belongs_to_org(organization_id));

