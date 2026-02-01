-- Enable RLS on core tables and add organization_id if missing

-- 1. Helper function to check/add column safely
CREATE OR REPLACE FUNCTION add_org_id_if_not_exists(tbl text) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'organization_id') THEN
        EXECUTE 'ALTER TABLE public.' || tbl || ' ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE';
        EXECUTE 'CREATE INDEX idx_' || tbl || '_org_id ON public.' || tbl || '(organization_id)';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Add organization_id to main entities
SELECT add_org_id_if_not_exists('products');
SELECT add_org_id_if_not_exists('categories');
SELECT add_org_id_if_not_exists('suppliers');
SELECT add_org_id_if_not_exists('customers');
SELECT add_org_id_if_not_exists('sales');
SELECT add_org_id_if_not_exists('purchases');
SELECT add_org_id_if_not_exists('inventory_movements');
SELECT add_org_id_if_not_exists('returns');
SELECT add_org_id_if_not_exists('cash_sessions');
SELECT add_org_id_if_not_exists('loyalty_programs');
SELECT add_org_id_if_not_exists('audit_logs');
-- Add to promotions if table exists (assuming it's 'promotions' or similar)
-- Checking for promotions table existence first would be safer but this helper handles column existence check.
-- If table doesn't exist, ALTER TABLE will fail. Let's wrap in DO block for tables that might not exist.

DO $$
BEGIN
    -- Promotions (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotions') THEN
        PERFORM add_org_id_if_not_exists('promotions');
    END IF;
    
    -- Customer Credits (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_credits') THEN
        PERFORM add_org_id_if_not_exists('customer_credits');
    END IF;

    -- Coupons (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons') THEN
        PERFORM add_org_id_if_not_exists('coupons');
    END IF;
END $$;


-- 3. Enable RLS on these tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create standard RLS policy function
CREATE OR REPLACE FUNCTION public.current_user_org_ids()
RETURNS TABLE(org_id UUID) AS $$
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Apply policies (DROP first to avoid conflicts)

-- Products
DROP POLICY IF EXISTS "Org Access Products" ON public.products;
CREATE POLICY "Org Access Products" ON public.products
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Categories
DROP POLICY IF EXISTS "Org Access Categories" ON public.categories;
CREATE POLICY "Org Access Categories" ON public.categories
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Suppliers
DROP POLICY IF EXISTS "Org Access Suppliers" ON public.suppliers;
CREATE POLICY "Org Access Suppliers" ON public.suppliers
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Customers
DROP POLICY IF EXISTS "Org Access Customers" ON public.customers;
CREATE POLICY "Org Access Customers" ON public.customers
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Sales
DROP POLICY IF EXISTS "Org Access Sales" ON public.sales;
CREATE POLICY "Org Access Sales" ON public.sales
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Purchases
DROP POLICY IF EXISTS "Org Access Purchases" ON public.purchases;
CREATE POLICY "Org Access Purchases" ON public.purchases
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Inventory Movements
DROP POLICY IF EXISTS "Org Access Inventory" ON public.inventory_movements;
CREATE POLICY "Org Access Inventory" ON public.inventory_movements
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Returns
DROP POLICY IF EXISTS "Org Access Returns" ON public.returns;
CREATE POLICY "Org Access Returns" ON public.returns
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Cash Sessions
DROP POLICY IF EXISTS "Org Access Cash Sessions" ON public.cash_sessions;
CREATE POLICY "Org Access Cash Sessions" ON public.cash_sessions
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Loyalty Programs
DROP POLICY IF EXISTS "Org Access Loyalty" ON public.loyalty_programs;
CREATE POLICY "Org Access Loyalty" ON public.loyalty_programs
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));

-- Audit Logs
DROP POLICY IF EXISTS "Org Access Audit" ON public.audit_logs;
CREATE POLICY "Org Access Audit" ON public.audit_logs
    USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))
    WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()));


-- 6. Grant permissions to service_role (just in case)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
