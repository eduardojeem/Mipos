-- Fix RLS policies to allow SUPER_ADMIN to access all records

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name = 'SUPER_ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Organization Policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        is_super_admin() OR 
        id IN (SELECT unnest(get_my_org_ids()))
    );

-- Allow Super Admin to manage organizations
DROP POLICY IF EXISTS "Super Admins can insert organizations" ON public.organizations;
CREATE POLICY "Super Admins can insert organizations" ON public.organizations
    FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can update organizations" ON public.organizations;
CREATE POLICY "Super Admins can update organizations" ON public.organizations
    FOR UPDATE USING (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can delete organizations" ON public.organizations;
CREATE POLICY "Super Admins can delete organizations" ON public.organizations
    FOR DELETE USING (is_super_admin());

-- Update Organization Members Policies
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (
        is_super_admin() OR 
        organization_id IN (SELECT unnest(get_my_org_ids()))
    );

-- Allow Super Admin to manage members
DROP POLICY IF EXISTS "Super Admins can manage members" ON public.organization_members;
CREATE POLICY "Super Admins can manage members" ON public.organization_members
    FOR ALL USING (is_super_admin());

-- Update Tenant Isolation Policy helper
-- We need to update the policies on data tables (products, sales, etc) to allow Super Admin to see all
-- Or we can keep them isolated and require Super Admin to "impersonate" or switch context.
-- For a SaaS dashboard, usually Super Admin wants to see aggregate data or specific org data.
-- Let's update the Tenant Isolation policy pattern to allow Super Admin to bypass it if needed,
-- OR better, for the Admin Panel, we might query `organizations` table directly which is now open.
-- If the Super Admin wants to see products of Org A, they should probably "switch" to Org A context.
-- But for the "SaaS Management Panel", we mostly need to see the Organizations list and Users list.

-- Let's ensure Users table is viewable by Super Admin
-- Public users table RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admins can view all users" ON public.users;
CREATE POLICY "Super Admins can view all users" ON public.users
    FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Super Admins can update users" ON public.users;
CREATE POLICY "Super Admins can update users" ON public.users
    FOR UPDATE USING (is_super_admin());
