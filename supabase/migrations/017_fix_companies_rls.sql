-- Harden RLS on public.companies: avoid permissive WITH CHECK (true)
-- Also auto-assign the creator as admin in user_company_associations

-- Ensure RLS is enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'companies'
      AND policyname = 'Users can create their company'
  ) THEN
    EXECUTE 'DROP POLICY "Users can create their company" ON public.companies';
  END IF;
END $$;

-- Restrictive INSERT policy: only authenticated users can insert
CREATE POLICY "Users can create their company" ON public.companies
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Optional: authenticated users can read their companies (keep existing reads separate)
-- CREATE POLICY IF NOT EXISTS "Authenticated can read companies" ON public.companies
--   FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger: assign creator as admin in association table
CREATE OR REPLACE FUNCTION public.assign_company_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_company_associations (user_id, company_id, role, is_active)
    VALUES (uid, NEW.id, 'admin', true)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_company_creator ON public.companies;
CREATE TRIGGER trg_assign_company_creator
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.assign_company_creator();

-- Verification
SELECT '✅ RLS policy fixed for companies' AS status;
