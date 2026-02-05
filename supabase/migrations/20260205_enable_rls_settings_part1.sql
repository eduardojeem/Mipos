-- ============================================================================
-- Migración RLS - PARTE 1: Preparación y Asignaciones
-- Ejecutar esta parte primero
-- ============================================================================

-- 1. Asignar organization_id a business_config existente
-- ============================================================================

-- Obtener la primera organización disponible
WITH first_org AS (
    SELECT id 
    FROM public.organizations 
    WHERE slug IN ('main-org', 'bfjeem') 
    OR name LIKE '%Principal%'
    LIMIT 1
)
UPDATE public.business_config 
SET organization_id = (SELECT id FROM first_org)
WHERE organization_id IS NULL;

-- Si no hay organización, crear una por defecto
INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
SELECT 'Organización Principal', 'main-org', 'ENTERPRISE', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'main-org');

-- Asignar organization_id nuevamente por si se creó la organización
WITH first_org AS (
    SELECT id 
    FROM public.organizations 
    LIMIT 1
)
UPDATE public.business_config 
SET organization_id = (SELECT id FROM first_org)
WHERE organization_id IS NULL;

-- 2. Asignar owner a organizaciones sin owner
-- ============================================================================

-- Para cada organización sin owner, asignar el primer miembro como owner
WITH orgs_without_owner AS (
    SELECT o.id as org_id
    FROM public.organizations o
    WHERE NOT EXISTS (
        SELECT 1 FROM public.organization_members om 
        WHERE om.organization_id = o.id AND om.is_owner = true
    )
),
first_members AS (
    SELECT DISTINCT ON (om.organization_id) 
        om.id as member_id,
        om.organization_id
    FROM public.organization_members om
    INNER JOIN orgs_without_owner owo ON owo.org_id = om.organization_id
    ORDER BY om.organization_id, om.created_at
)
UPDATE public.organization_members
SET is_owner = true
WHERE id IN (SELECT member_id FROM first_members);

-- Verificación
SELECT 
    'business_config con organization_id' as check_name,
    COUNT(*) FILTER (WHERE organization_id IS NOT NULL) as with_org,
    COUNT(*) FILTER (WHERE organization_id IS NULL) as without_org
FROM public.business_config
UNION ALL
SELECT 
    'organizaciones sin owner' as check_name,
    COUNT(*) - COUNT(DISTINCT om.organization_id) as with_org,
    COUNT(DISTINCT om.organization_id) as without_org
FROM public.organizations o
LEFT JOIN public.organization_members om ON om.organization_id = o.id AND om.is_owner = true;
