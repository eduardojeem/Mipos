-- ============================================================================
-- FIX: Acceso a organizaciones durante autenticación
-- Problema: RLS bloquea acceso a organization_members después del login
-- Solución: Políticas más permisivas que permiten acceso con auth.uid()
-- ============================================================================

-- 1. Verificar que auth.uid() funciona
-- ============================================================================
-- Esta función verifica si hay un usuario autenticado
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Recrear política de SELECT para organization_members (más permisiva)
-- ============================================================================
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;

-- Política más simple que solo verifica auth.uid()
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (
        -- Permitir si es SUPER_ADMIN
        is_super_admin()
        OR
        -- Permitir si el usuario está autenticado y consulta sus propias membresías
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR
        -- Permitir si el usuario está autenticado y pertenece a la misma organización
        (
            auth.uid() IS NOT NULL 
            AND organization_id IN (
                SELECT om.organization_id 
                FROM public.organization_members om 
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- 3. Recrear política de SELECT para organizations (más permisiva)
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

-- Política más simple que permite ver organizaciones si el usuario está autenticado
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        -- Permitir si es SUPER_ADMIN
        is_super_admin()
        OR
        -- Permitir si el usuario está autenticado y pertenece a la organización
        (
            auth.uid() IS NOT NULL
            AND id IN (
                SELECT om.organization_id 
                FROM public.organization_members om 
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- 4. Agregar política para permitir INSERT de nuevos miembros (para onboarding)
-- ============================================================================
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.organization_members;

CREATE POLICY "Allow insert for authenticated users" ON public.organization_members
    FOR INSERT WITH CHECK (
        -- SUPER_ADMIN puede insertar cualquier miembro
        is_super_admin()
        OR
        -- Owners pueden agregar miembros a su organización
        (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 
                FROM public.organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.is_owner = true
            )
        )
    );

-- 5. Verificación
-- ============================================================================
SELECT 
    '✅ Políticas actualizadas' as status,
    tablename,
    policyname
FROM pg_policies
WHERE tablename IN ('organization_members', 'organizations')
ORDER BY tablename, policyname;

-- Test de acceso (debe funcionar si el usuario está autenticado)
SELECT 
    '✅ Test de acceso' as status,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Usuario autenticado: ' || auth.uid()::text
        ELSE 'No hay usuario autenticado'
    END as user_status;

SELECT '🎉 FIX DE AUTENTICACIÓN APLICADO' as result;
