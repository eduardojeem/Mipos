-- ============================================================================
-- Migración RLS - PARTE 3: Habilitar RLS y Políticas para business_config
-- Ejecutar después de la Parte 2
-- ============================================================================

-- 1. Habilitar RLS en business_config
-- ============================================================================
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para business_config
-- ============================================================================

-- Política de SELECT
DROP POLICY IF EXISTS "Users can view their org config" ON public.business_config;
CREATE POLICY "Users can view their org config" ON public.business_config
    FOR SELECT USING (
        is_super_admin() 
        OR 
        organization_id = ANY(get_user_org_ids())
    );

-- Política de UPDATE
DROP POLICY IF EXISTS "Admins can update their org config" ON public.business_config;
CREATE POLICY "Admins can update their org config" ON public.business_config
    FOR UPDATE USING (
        is_super_admin()
        OR
        (
            organization_id = ANY(get_user_org_ids())
            AND EXISTS (
                SELECT 1 
                FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid() 
                AND r.name IN ('ADMIN', 'SUPER_ADMIN')
                AND ur.is_active = true
            )
        )
    );

-- Política de INSERT
DROP POLICY IF EXISTS "Admins can insert org config" ON public.business_config;
CREATE POLICY "Admins can insert org config" ON public.business_config
    FOR INSERT WITH CHECK (
        is_super_admin()
        OR
        (
            organization_id = ANY(get_user_org_ids())
            AND EXISTS (
                SELECT 1 
                FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid() 
                AND r.name IN ('ADMIN', 'SUPER_ADMIN')
                AND ur.is_active = true
            )
        )
    );

-- Verificación
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'business_config'
ORDER BY policyname;
