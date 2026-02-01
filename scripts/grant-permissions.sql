GRANT ALL ON public.organizations TO postgres;
GRANT ALL ON public.organizations TO service_role;
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO anon;

GRANT ALL ON public.organization_members TO postgres;
GRANT ALL ON public.organization_members TO service_role;
GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO anon;

GRANT ALL ON public.saas_plans TO postgres;
GRANT ALL ON public.saas_plans TO service_role;
GRANT ALL ON public.saas_plans TO authenticated;
GRANT ALL ON public.saas_plans TO anon;

-- Enable RLS just in case (optional, but good practice)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

-- Create basic policies for Service Role to ensure it can access
CREATE POLICY "Service Role Full Access Organizations" ON public.organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service Role Full Access Members" ON public.organization_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service Role Full Access Plans" ON public.saas_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
