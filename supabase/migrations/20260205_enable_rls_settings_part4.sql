-- ============================================================================
-- Migración RLS - PARTE 4: Políticas para organizations y organization_members
-- Ejecutar después de la Parte 3
-- ============================================================================

-- 1. Habilitar RLS en organizations
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para organizations
-- ============================================================================

DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todas
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

DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization" ON public.organizations
    FOR UPDATE USING (
        is_super_admin()
        OR
        (
            id = ANY(get_user_org_ids())
            AND EXISTS (
                SELECT 1 
                FROM public.organization_members om
                WHERE om.organization_id = organizations.id
                AND om.user_id = auth.uid()
                AND om.is_owner = true
            )
        )
    );

-- 3. Habilitar RLS en organization_members
-- ============================================================================
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para organization_members
-- ============================================================================
-- IMPORTANTE: No usar get_user_org_ids() aquí para evitar recursión infinita
-- En su lugar, usar consulta directa con auth.uid()

DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
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

DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
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

-- Política adicional para INSERT (onboarding de nuevos usuarios)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.organization_members;
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

-- Verificación
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('organizations', 'organization_members')
GROUP BY tablename
ORDER BY tablename;
