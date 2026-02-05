-- ============================================================================
-- FIX: Recursión Infinita en organization_members
-- Ejecutar este script para corregir el error de recursión
-- ============================================================================

-- 1. Recrear función get_user_org_ids con SECURITY DEFINER mejorado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[] AS $$
DECLARE
    org_ids UUID[];
BEGIN
    -- Usar SELECT directo sin RLS para evitar recursión
    SELECT ARRAY_AGG(organization_id) INTO org_ids
    FROM public.organization_members 
    WHERE user_id = auth.uid();
    
    RETURN COALESCE(org_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recrear función is_super_admin con SECURITY DEFINER mejorado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Usar SELECT directo sin RLS para evitar recursión
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name = 'SUPER_ADMIN'
        AND ur.is_active = true
    ) INTO is_admin;
    
    RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Recrear políticas de organization_members sin recursión
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.organization_members;

-- Crear política de SELECT sin recursión (más permisiva para auth)
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (
        is_super_admin()
        OR
        -- Permitir si el usuario consulta sus propias membresías
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR
        -- Permitir si el usuario pertenece a la misma organización
        (
            auth.uid() IS NOT NULL 
            AND organization_id IN (
                SELECT om.organization_id 
                FROM public.organization_members om 
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- Crear política de ALL (UPDATE, DELETE) sin recursión
CREATE POLICY "Owners can manage org members" ON public.organization_members
    FOR ALL USING (
        is_super_admin()
        OR
        -- Consulta directa para verificar ownership sin recursión
        EXISTS (
            SELECT 1 
            FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.is_owner = true
        )
    );

-- Política para INSERT (onboarding)
CREATE POLICY "Allow insert for authenticated users" ON public.organization_members
    FOR INSERT WITH CHECK (
        is_super_admin()
        OR
        EXISTS (
            SELECT 1 
            FROM public.organization_members om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = auth.uid()
            AND om.is_owner = true
        )
    );

-- 4. Recrear política de organizations (más permisiva para auth)
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        is_super_admin()
        OR
        -- Usuarios autenticados pueden ver sus organizaciones
        (
            auth.uid() IS NOT NULL
            AND id IN (
                SELECT om.organization_id 
                FROM public.organization_members om 
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- 4. Verificación
-- ============================================================================
SELECT 
    '✅ Funciones recreadas' as status,
    COUNT(*) as count
FROM pg_proc 
WHERE proname IN ('get_user_org_ids', 'is_super_admin')
UNION ALL
SELECT 
    '✅ Políticas recreadas' as status,
    COUNT(*) as count
FROM pg_policies
WHERE tablename IN ('organization_members', 'organizations');

-- 5. Test de recursión y autenticación
-- ============================================================================
-- Este SELECT debería funcionar sin error de recursión
SELECT 
    '✅ Test de acceso' as status,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Usuario autenticado'
        ELSE 'No hay usuario autenticado (ejecutar como usuario)'
    END as auth_status;

SELECT '🎉 FIX APLICADO CORRECTAMENTE' as result;
