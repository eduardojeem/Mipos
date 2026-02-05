-- ============================================================================
-- DIAGNÓSTICO: Estado Actual de RLS y Políticas
-- Ejecutar este script para verificar el estado antes de aplicar el fix
-- ============================================================================

-- 1. Verificar estado de RLS en tablas críticas
-- ============================================================================
SELECT 
    '📊 ESTADO DE RLS' as section,
    tablename,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS HABILITADO'
        ELSE '🔓 RLS DESHABILITADO'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organization_members', 'organizations', 'business_config', 'user_settings')
ORDER BY tablename;

-- 2. Verificar funciones helper
-- ============================================================================
SELECT 
    '🔧 FUNCIONES HELPER' as section,
    proname as function_name,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '❌ NO SECURITY DEFINER'
    END as security_status,
    pg_get_functiondef(oid) LIKE '%SET search_path%' as has_search_path_set
FROM pg_proc
WHERE proname IN ('get_user_org_ids', 'is_super_admin')
ORDER BY proname;

-- 3. Verificar políticas de organization_members
-- ============================================================================
SELECT 
    '🛡️ POLÍTICAS: organization_members' as section,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ USING clause'
        ELSE '❌ Sin USING'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ WITH CHECK clause'
        ELSE '❌ Sin WITH CHECK'
    END as with_check_status
FROM pg_policies
WHERE tablename = 'organization_members'
ORDER BY policyname;

-- 4. Verificar políticas de organizations
-- ============================================================================
SELECT 
    '🛡️ POLÍTICAS: organizations' as section,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ USING clause'
        ELSE '❌ Sin USING'
    END as using_status
FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY policyname;

-- 5. Verificar usuario actual (si está autenticado)
-- ============================================================================
SELECT 
    '👤 USUARIO ACTUAL' as section,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN '✅ Usuario autenticado'
        ELSE '⚠️ No hay usuario autenticado (ejecutar como usuario)'
    END as auth_status,
    auth.uid() as user_id;

-- 6. Test de acceso a organization_members (si está autenticado)
-- ============================================================================
SELECT 
    '🧪 TEST: Acceso a organization_members' as section,
    COUNT(*) as memberships_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Puede acceder a membresías'
        WHEN auth.uid() IS NULL THEN '⚠️ No autenticado'
        ELSE '❌ Sin membresías o bloqueado por RLS'
    END as access_status
FROM public.organization_members
WHERE user_id = auth.uid();

-- 7. Test de acceso a organizations (si está autenticado)
-- ============================================================================
SELECT 
    '🧪 TEST: Acceso a organizations' as section,
    COUNT(*) as organizations_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Puede acceder a organizaciones'
        WHEN auth.uid() IS NULL THEN '⚠️ No autenticado'
        ELSE '❌ Sin organizaciones o bloqueado por RLS'
    END as access_status
FROM public.organizations
WHERE id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
);

-- 8. Resumen y recomendaciones
-- ============================================================================
SELECT 
    '📋 RESUMEN' as section,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE tablename = 'organization_members'
        ) >= 3 THEN '✅ Políticas de organization_members OK'
        ELSE '❌ Faltan políticas en organization_members'
    END as org_members_policies,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE tablename = 'organizations'
        ) >= 1 THEN '✅ Políticas de organizations OK'
        ELSE '❌ Faltan políticas en organizations'
    END as organizations_policies,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM pg_proc 
            WHERE proname IN ('get_user_org_ids', 'is_super_admin')
            AND prosecdef = true
        ) = 2 THEN '✅ Funciones helper OK'
        ELSE '❌ Faltan funciones helper'
    END as helper_functions;

-- 9. Acción recomendada
-- ============================================================================
SELECT 
    '🎯 ACCIÓN RECOMENDADA' as section,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM pg_policies 
            WHERE tablename = 'organization_members'
            AND policyname LIKE '%can view org members%'
        ) = 0 THEN '⚠️ EJECUTAR: 20260205_fix_infinite_recursion.sql'
        ELSE '✅ Fix ya aplicado - Si hay error, verificar auth.uid()'
    END as recommendation;

SELECT '✅ DIAGNÓSTICO COMPLETO' as result;
