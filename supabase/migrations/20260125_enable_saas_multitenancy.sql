-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subscription_plan TEXT DEFAULT 'FREE', -- FREE, PRO, ENTERPRISE
    subscription_status TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAST_DUE, CANCELED
    settings JSONB DEFAULT '{}'::jsonb, -- Store org-specific settings (tax, currency, etc)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Organization Members Table (Link Users to Orgs)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role_id TEXT REFERENCES public.roles(id), -- Link to roles table
    is_owner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Create Default Organization (for migration of existing data)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Check if we have any organization, if not create one
    IF NOT EXISTS (SELECT 1 FROM public.organizations) THEN
        INSERT INTO public.organizations (name, slug, subscription_plan)
        VALUES ('Organización Principal', 'main-org', 'ENTERPRISE')
        RETURNING id INTO default_org_id;
        
        -- If we just created it, we need to assign existing data to it later
    ELSE
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    END IF;

    -- Store default_org_id in a temp table or variable to use in ALTER statements if needed
    -- However, we can't easily pass variables between blocks in pure SQL script without temp tables
    -- So we will handle the column addition with a default value subquery
END $$;

-- 4. Add organization_id to all relevant tables
-- Helper function to add column if not exists
CREATE OR REPLACE FUNCTION add_org_column(tbl text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE', tbl);
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
SELECT add_org_column('products');
SELECT add_org_column('categories');
SELECT add_org_column('customers');
SELECT add_org_column('suppliers');
SELECT add_org_column('sales');
SELECT add_org_column('purchases');
SELECT add_org_column('inventory_movements');
SELECT add_org_column('returns');
SELECT add_org_column('user_roles'); -- Scope roles to organization

-- 5. Backfill organization_id for existing data (if any)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    IF default_org_id IS NOT NULL THEN
        UPDATE public.products SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.categories SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.customers SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.suppliers SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.sales SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.purchases SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.inventory_movements SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.returns SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.user_roles SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 6. Make organization_id NOT NULL after backfill
ALTER TABLE public.products ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL; -- Categories might be global? Let's make them org-specific for SaaS
-- If categories were shared, we would keep it nullable or have a separate global table. Assuming org-specific for SaaS isolation.
ALTER TABLE public.categories ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.sales ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.purchases ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.inventory_movements ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.returns ALTER COLUMN organization_id SET NOT NULL;

-- 7. Update RLS Policies for Multi-Tenancy
-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization IDs
CREATE OR REPLACE FUNCTION get_my_org_ids() RETURNS UUID[] AS $$
    SELECT array_agg(organization_id) FROM public.organization_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user belongs to org
CREATE OR REPLACE FUNCTION belongs_to_org(org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE user_id = auth.uid() AND organization_id = org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Policies (Example for products, repeat for others)
DROP POLICY IF EXISTS "Tenant Isolation" ON public.products;
CREATE POLICY "Tenant Isolation" ON public.products
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Tenant Isolation" ON public.sales;
CREATE POLICY "Tenant Isolation" ON public.sales
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Tenant Isolation" ON public.customers;
CREATE POLICY "Tenant Isolation" ON public.customers
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));
    
DROP POLICY IF EXISTS "Tenant Isolation" ON public.suppliers;
CREATE POLICY "Tenant Isolation" ON public.suppliers
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));
    
DROP POLICY IF EXISTS "Tenant Isolation" ON public.categories;
CREATE POLICY "Tenant Isolation" ON public.categories
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

-- Organization Policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (id IN (SELECT unnest(get_my_org_ids())));

DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

-- 8. Setup Super Admin User (jeem101595@gmail.com)
DO $$
DECLARE
    target_email TEXT := 'jeem101595@gmail.com';
    user_record RECORD;
    org_id UUID;
    admin_role_id TEXT;
    super_admin_role_id TEXT;
BEGIN
    -- Get the default organization
    SELECT id INTO org_id FROM public.organizations LIMIT 1;
    
    -- Create SUPER_ADMIN role if not exists
    INSERT INTO public.roles (name, display_name, description, is_system_role)
    VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acceso total al sistema y configuración global', TRUE)
    ON CONFLICT (name) DO UPDATE SET display_name = 'Super Administrador'
    RETURNING id INTO super_admin_role_id;
    
    -- Get ADMIN role id
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';

    -- Try to find the user in auth.users (requires permissions, usually accessible in migration context if run as superuser/postgres)
    -- Note: accessing auth.users directly might fail depending on execution context. 
    -- We assume this runs with sufficient privileges.
    
    -- We'll try to find the user in public.users first (if already synced)
    SELECT * INTO user_record FROM public.users WHERE email = target_email;
    
    IF user_record.id IS NOT NULL THEN
        -- User exists in public.users
        
        -- Assign to Org as Owner/Admin
        INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
        VALUES (org_id, user_record.id, admin_role_id, TRUE)
        ON CONFLICT (organization_id, user_id) 
        DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;
        
        -- Assign SUPER_ADMIN role globally (or in context of org if using org-based roles)
        -- We'll put it in user_roles for global/system capability if needed, or rely on org ownership.
        -- Let's give them the SUPER_ADMIN role in user_roles linked to the org
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (user_record.id, super_admin_role_id, org_id)
        ON CONFLICT (user_id, role_id) 
        DO UPDATE SET organization_id = org_id; -- Update org link if exists
        
    ELSE
        -- User not in public.users. They might be in auth.users but not synced, or not exist at all.
        -- We can't insert into auth.users easily here.
        -- We will create a trigger function to auto-assign this specific email when they sign up.
        NULL; -- Logic handled by trigger below
    END IF;
END $$;

-- 9. Trigger to auto-assign Super Admin on signup for specific email
CREATE OR REPLACE FUNCTION public.handle_new_user_saas()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
    super_admin_role_id TEXT;
BEGIN
    -- Insert into public.users
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 'CASHIER')
    ON CONFLICT (id) DO NOTHING;
    
    -- Specific logic for Super Admin
    IF NEW.email = 'jeem101595@gmail.com' THEN
        -- Get default org
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
        SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
        
        -- Add to org
        INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
        VALUES (default_org_id, NEW.id, super_admin_role_id, TRUE);
        
        -- Assign Role
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (NEW.id, super_admin_role_id, default_org_id);
        
        -- Update user table role for quick access
        UPDATE public.users SET role = 'ADMIN' WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (drop first to ensure clean state)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_saas();

