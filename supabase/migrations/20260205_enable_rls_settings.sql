-- ============================================================================
-- Migración: Habilitar RLS y Corregir Problemas de Multitenancy
-- Fecha: 2026-02-05
-- Descripción: Habilita Row Level Security y corrige problemas identificados
--              en la auditoría de integración SaaS
-- ============================================================================

-- 1. Asignar organization_id a business_config existente
-- ============================================================================
DO $
DECLARE
    default_org_id UUID;
BEGIN
    -- Obtener la primera organización (o la principal)
    SELECT id INTO default_org_id 
    FROM public.organizations 
    WHERE slug IN ('main-org', 'bfjeem') 
    OR name LIKE '%Principal%'
    LIMIT 1;
    
    -- Si no hay organización, crear una por defecto
    IF default_org_id IS NULL THEN
        INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
        VALUES ('Organización Principal', 'main-org', 'ENTERPRISE', 'ACTIVE')
        RETURNING id INTO default_org_id;
    END IF;
    
    -- Asignar organization_id a business_config sin organización
    UPDATE public.business_config 
    SET organization_id = default_org_id
    WHERE organization_id IS NULL;
    
    RAISE NOTICE 'business_config actualizado con organization_id: %', default_org_id;
END $;

-- 2. Asignar owner a organizaciones sin owner
-- ============================================================================
DO $
DECLARE
    org_record RECORD;
    first_member_id UUID;
BEGIN
    -- Para cada organización sin owner
    FOR org_record IN 
        SELECT o.id, o.name 
        FROM public.organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM public.organization_members om 
            WHERE om.organization_id = o.id AND om.is_owner = true
        )
    LOOP
        -- Obtener el primer miembro de la organización
        SELECT id INTO first_member_id
        FROM public.organization_members
        WHERE organization_id = org_record.id
        LIMIT 1;
        
        -- Si hay miembros, asignar el primero como owner
        IF first_member_id IS NOT NULL THEN
            UPDATE public.organization_members
            SET is_owner = true
            WHERE id = first_member_id;
            
            RAISE NOTICE 'Owner asignado a organización: %', org_record.name;
        END IF;
    END LOOP;
END $;

-- 3. Habilitar RLS en todas las tablas relevantes
-- ============================================================================
ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 4. Crear función helper para obtener organization_ids del usuario
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS UUID[] AS $
BEGIN
    RETURN ARRAY(
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear función helper para verificar si es SUPER_ADMIN
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
        AND r.name = 'SUPER_ADMIN'
        AND ur.is_active = true
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Políticas RLS para business_config
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their org config" ON public.business_config;
CREATE POLICY "Users can view their org config" ON public.business_config
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todo
        is_super_admin() 
        OR 
        -- Usuarios pueden ver config de su organización
        organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Admins can update their org config" ON public.business_config;
CREATE POLICY "Admins can update their org config" ON public.business_config
    FOR UPDATE USING (
        -- SUPER_ADMIN puede actualizar todo
        is_super_admin()
        OR
        -- ADMIN puede actualizar config de su organización
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

DROP POLICY IF EXISTS "Admins can insert org config" ON public.business_config;
CREATE POLICY "Admins can insert org config" ON public.business_config
    FOR INSERT WITH CHECK (
        -- SUPER_ADMIN puede insertar cualquier config
        is_super_admin()
        OR
        -- ADMIN puede insertar config para su organización
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

-- 7. Políticas RLS para organizations
-- ============================================================================
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todas
        is_super_admin()
        OR
        -- Miembros pueden ver sus organizaciones
        id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;
CREATE POLICY "Owners can update their organization" ON public.organizations
    FOR UPDATE USING (
        -- SUPER_ADMIN puede actualizar todas
        is_super_admin()
        OR
        -- Owners pueden actualizar su organización
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

-- 8. Políticas RLS para organization_members
-- ============================================================================
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todos
        is_super_admin()
        OR
        -- Miembros pueden ver miembros de sus organizaciones
        organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
CREATE POLICY "Owners can manage org members" ON public.organization_members
    FOR ALL USING (
        -- SUPER_ADMIN puede gestionar todos
        is_super_admin()
        OR
        -- Owners pueden gestionar miembros de su organización
        (
            organization_id = ANY(get_user_org_ids())
            AND EXISTS (
                SELECT 1 
                FROM public.organization_members om
                WHERE om.organization_id = organization_members.organization_id
                AND om.user_id = auth.uid()
                AND om.is_owner = true
            )
        )
    );

-- 9. Políticas RLS para products
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their org products" ON public.products;
CREATE POLICY "Users can view their org products" ON public.products
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todos
        is_super_admin()
        OR
        -- Usuarios pueden ver productos de su organización
        organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org products" ON public.products;
CREATE POLICY "Users can manage their org products" ON public.products
    FOR ALL USING (
        -- SUPER_ADMIN puede gestionar todos
        is_super_admin()
        OR
        -- Usuarios pueden gestionar productos de su organización
        organization_id = ANY(get_user_org_ids())
    );

-- 10. Políticas RLS para sales
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their org sales" ON public.sales;
CREATE POLICY "Users can view their org sales" ON public.sales
    FOR SELECT USING (
        -- SUPER_ADMIN puede ver todas
        is_super_admin()
        OR
        -- Usuarios pueden ver ventas de su organización
        organization_id = ANY(get_user_org_ids())
    );

DROP POLICY IF EXISTS "Users can manage their org sales" ON public.sales;
CREATE POLICY "Users can manage their org sales" ON public.sales
    FOR ALL USING (
        -- SUPER_ADMIN puede gestionar todas
        is_super_admin()
        OR
        -- Usuarios pueden gestionar ventas de su organización
        organization_id = ANY(get_user_org_ids())
    );

-- 11. Políticas RLS para customers
-- ============================================================================
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

-- 12. Políticas RLS para suppliers
-- ============================================================================
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

-- 13. Políticas RLS para categories
-- ============================================================================
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

-- 14. Verificación final
-- ============================================================================
DO $
DECLARE
    rls_status RECORD;
BEGIN
    RAISE NOTICE '=== Verificación de RLS ===';
    
    FOR rls_status IN 
        SELECT 
            schemaname,
            tablename,
            rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'business_config', 'organizations', 'organization_members',
            'products', 'sales', 'customers', 'suppliers', 'categories'
        )
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Tabla: % - RLS: %', 
            rls_status.tablename, 
            CASE WHEN rls_status.rowsecurity THEN 'HABILITADO' ELSE 'DESHABILITADO' END;
    END LOOP;
END $;

-- ============================================================================
-- Fin de la migración
-- ============================================================================
