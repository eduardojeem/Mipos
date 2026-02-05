-- ============================================================================
-- Migración RLS - PARTE 2: Funciones Helper
-- Ejecutar después de la Parte 1
-- ============================================================================

-- 1. Crear función helper para obtener organization_ids del usuario
-- ============================================================================
-- IMPORTANTE: SECURITY DEFINER permite bypass de RLS para evitar recursión infinita
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

-- 2. Crear función helper para verificar si es SUPER_ADMIN
-- ============================================================================
-- IMPORTANTE: SECURITY DEFINER permite bypass de RLS para evitar recursión infinita
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

-- Verificación
SELECT 
    'Función get_user_org_ids creada' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'get_user_org_ids'
UNION ALL
SELECT 
    'Función is_super_admin creada' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'is_super_admin';
