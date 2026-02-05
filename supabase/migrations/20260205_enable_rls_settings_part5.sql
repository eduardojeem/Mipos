-- ============================================================================
-- Migración RLS - PARTE 5: Políticas para products, sales, customers, suppliers
-- Ejecutar después de la Parte 4
-- ============================================================================

-- 1. Habilitar RLS en products
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org products" ON public.products;
CREATE POLICY "Users can view their org products" ON public.products
    FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org products" ON public.products;
CREATE POLICY "Users can manage their org products" ON public.products
    FOR ALL USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

-- 2. Habilitar RLS en sales
-- ============================================================================
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org sales" ON public.sales;
CREATE POLICY "Users can view their org sales" ON public.sales
    FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org sales" ON public.sales;
CREATE POLICY "Users can manage their org sales" ON public.sales
    FOR ALL USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

-- 3. Habilitar RLS en customers
-- ============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org customers" ON public.customers;
CREATE POLICY "Users can view their org customers" ON public.customers
    FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org customers" ON public.customers;
CREATE POLICY "Users can manage their org customers" ON public.customers
    FOR ALL USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

-- 4. Habilitar RLS en suppliers
-- ============================================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org suppliers" ON public.suppliers;
CREATE POLICY "Users can view their org suppliers" ON public.suppliers
    FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org suppliers" ON public.suppliers;
CREATE POLICY "Users can manage their org suppliers" ON public.suppliers
    FOR ALL USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

-- Verificación
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('products', 'sales', 'customers', 'suppliers')
GROUP BY tablename
ORDER BY tablename;
