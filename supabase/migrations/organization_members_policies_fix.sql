-- Fix non-recursive RLS policies for organization_members
-- Uses SECURITY DEFINER helper functions to avoid policy self-recursion

-- 1) Helper: Check if current user is owner of an organization
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean AS $$
DECLARE
  is_owner boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.is_owner = true
  ) INTO is_owner;

  RETURN COALESCE(is_owner, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Ensure get_user_org_ids exists (returns array of org IDs for current user)
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS uuid[] AS $$
DECLARE
  org_ids uuid[];
BEGIN
  SELECT ARRAY_AGG(organization_id) INTO org_ids
  FROM public.organization_members
  WHERE user_id = auth.uid();

  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) Recreate policies without self-recursive subqueries
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.organization_members;

-- SELECT: allow user to see their own rows, same-organization rows, or super admin
CREATE POLICY "Members can view org members" ON public.organization_members
  FOR SELECT USING (
    is_super_admin()
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR organization_id = ANY(public.get_user_org_ids())
  );

-- ALL (UPDATE/DELETE): allow super admin or org owners
CREATE POLICY "Owners can manage org members" ON public.organization_members
  FOR ALL USING (
    is_super_admin()
    OR public.is_org_owner(organization_members.organization_id)
  );

-- INSERT: allow super admin or org owners to add members
CREATE POLICY "Allow insert for authenticated users" ON public.organization_members
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR public.is_org_owner(organization_members.organization_id)
  );

