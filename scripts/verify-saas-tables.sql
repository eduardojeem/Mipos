-- Script de verificación de tablas SaaS Multi-Tenant
-- Ejecutar este script en Supabase SQL Editor para verificar la estructura

-- 1. Verificar que existen las tablas
SELECT 
    'organizations' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
    ) as exists;

SELECT 
    'organization_members' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_members'
    ) as exists;

-- 2. Verificar columnas de organizations
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 3. Verificar columnas de organization_members
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- 4. Verificar constraints y foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('organizations', 'organization_members')
ORDER BY tc.table_name, tc.constraint_type;

-- 5. Verificar RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'organization_members');

-- 6. Verificar políticas de RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'organization_members');

-- 7. Contar organizaciones existentes
SELECT COUNT(*) as total_organizations FROM public.organizations;

-- 8. Ver organizaciones existentes
SELECT 
    id,
    name,
    slug,
    subscription_plan,
    subscription_status,
    created_at
FROM public.organizations
ORDER BY created_at DESC;

-- 9. Contar miembros de organizaciones
SELECT COUNT(*) as total_members FROM public.organization_members;

-- 10. Ver distribución de miembros por organización
SELECT 
    o.name as organization_name,
    o.slug,
    COUNT(om.user_id) as member_count
FROM public.organizations o
LEFT JOIN public.organization_members om ON o.id = om.organization_id
GROUP BY o.id, o.name, o.slug
ORDER BY member_count DESC;

-- 11. Verificar funciones helper
SELECT 
    proname as function_name,
    pronargs as num_args,
    prorettype::regtype as return_type
FROM pg_proc
WHERE proname IN ('get_my_org_ids', 'belongs_to_org', 'handle_new_user_saas')
AND pronamespace = 'public'::regnamespace;

-- 12. Verificar triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
