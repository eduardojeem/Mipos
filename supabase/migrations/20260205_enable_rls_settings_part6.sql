-- ============================================================================
-- Migración RLS - PARTE 6: Políticas para categories y Verificación Final
-- Ejecutar después de la Parte 5 (ÚLTIMA PARTE)
-- ============================================================================

-- 1. Habilitar RLS en categories
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org categories" ON public.categories;
CREATE POLICY "Users can view their org categories" ON public.categories
    FOR SELECT USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org categories" ON public.categories;
CREATE POLICY "Users can manage their org categories" ON public.categories
    FOR ALL USING (
        is_super_admin() OR organization_id = ANY(get_user_org_ids())
    );

-- 2. Verificación Final Completa
-- ============================================================================

-- Verificar RLS habilitado en todas las tablas
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ HABILITADO'
        ELSE '❌ DESHABILITADO'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'business_config', 'organizations', 'organization_members',
    'products', 'sales', 'customers', 'suppliers', 'categories'
)
ORDER BY tablename;

-- Contar políticas por tabla
SELECT 
    tablename,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN (
    'business_config', 'organizations', 'organization_members',
    'products', 'sales', 'customers', 'suppliers', 'categories'
)
GROUP BY tablename
ORDER BY tablename;

-- Verificar funciones helper
SELECT 
    proname as function_name,
    '✅ CREADA' as status
FROM pg_proc 
WHERE proname IN ('get_user_org_ids', 'is_super_admin')
ORDER BY proname;

-- Verificar business_config con organization_id
SELECT 
    COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as with_org_id,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as without_org_id,
    COUNT(*) as total
FROM public.business_config;

-- Verificar organizaciones con owner
SELECT 
    o.name as organization_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.organization_members om 
            WHERE om.organization_id = o.id AND om.is_owner = true
        ) THEN '✅ Tiene owner'
        ELSE '❌ Sin owner'
    END as owner_status
FROM public.organizations o
ORDER BY o.name;

-- Resumen final
SELECT 
    '🎉 MIGRACIÓN RLS COMPLETADA' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN (
        'business_config', 'organizations', 'organization_members',
        'products', 'sales', 'customers', 'suppliers', 'categories'
    )) as total_policies_created,
    (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_user_org_ids', 'is_super_admin')) as helper_functions_created;
