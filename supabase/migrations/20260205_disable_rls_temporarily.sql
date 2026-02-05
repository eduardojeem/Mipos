-- ============================================================================
-- SOLUCIÓN TEMPORAL: Deshabilitar RLS en tablas de autenticación
-- Usar solo temporalmente para permitir login mientras se investiga el problema
-- ============================================================================

-- ⚠️ ADVERTENCIA: Esto deshabilita RLS temporalmente
-- Solo usar en desarrollo o mientras se corrige el problema

-- 1. Deshabilitar RLS en organization_members
-- ============================================================================
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- 2. Deshabilitar RLS en organizations
-- ============================================================================
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- 3. Verificación
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS HABILITADO'
        ELSE '🔓 RLS DESHABILITADO'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('organization_members', 'organizations')
ORDER BY tablename;

-- 4. Nota importante
-- ============================================================================
SELECT '⚠️ RLS DESHABILITADO TEMPORALMENTE' as warning,
       'Esto permite el login pero reduce la seguridad' as note,
       'Habilitar RLS nuevamente después de corregir las políticas' as action;

-- Para volver a habilitar RLS más tarde:
-- ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
