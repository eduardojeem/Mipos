-- =====================================================
-- Migración: Agregar Multitenancy a business_config
-- Fecha: 2026-02-05
-- Descripción: Agrega organization_id y actualiza RLS
-- =====================================================

-- 1. Agregar columna organization_id
ALTER TABLE public.business_config 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_business_config_organization_id 
ON public.business_config(organization_id);

-- 3. Migrar datos existentes (asignar a primera organización si existe)
DO $$
DECLARE
  first_org_id UUID;
BEGIN
  -- Obtener la primera organización
  SELECT id INTO first_org_id 
  FROM public.organizations 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Si existe una organización, asignar configuraciones huérfanas
  IF first_org_id IS NOT NULL THEN
    UPDATE public.business_config 
    SET organization_id = first_org_id 
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- 4. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.business_config;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.business_config;
DROP POLICY IF EXISTS "Enable update for admins only" ON public.business_config;

-- 5. Crear nuevas políticas con multitenancy

-- SUPER_ADMIN puede ver todas las configuraciones
CREATE POLICY "super_admin_read_all_business_config" 
ON public.business_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
    AND ur.is_active = true
  )
);

-- ADMIN puede ver solo la configuración de su organización
CREATE POLICY "admin_read_own_org_business_config" 
ON public.business_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = om.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE om.user_id = auth.uid()
    AND om.organization_id = business_config.organization_id
    AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    AND ur.is_active = true
  )
);

-- SUPER_ADMIN puede insertar configuraciones para cualquier organización
CREATE POLICY "super_admin_insert_business_config" 
ON public.business_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
    AND ur.is_active = true
  )
);

-- ADMIN puede insertar configuración solo para su organización
CREATE POLICY "admin_insert_own_org_business_config" 
ON public.business_config
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = om.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE om.user_id = auth.uid()
    AND om.organization_id = business_config.organization_id
    AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    AND ur.is_active = true
  )
);

-- SUPER_ADMIN puede actualizar cualquier configuración
CREATE POLICY "super_admin_update_all_business_config" 
ON public.business_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
    AND ur.is_active = true
  )
);

-- ADMIN puede actualizar solo la configuración de su organización
CREATE POLICY "admin_update_own_org_business_config" 
ON public.business_config
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.user_roles ur ON ur.user_id = om.user_id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE om.user_id = auth.uid()
    AND om.organization_id = business_config.organization_id
    AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    AND ur.is_active = true
  )
);

-- SUPER_ADMIN puede eliminar cualquier configuración
CREATE POLICY "super_admin_delete_all_business_config" 
ON public.business_config
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'SUPER_ADMIN'
    AND ur.is_active = true
  )
);

-- 6. Agregar columnas faltantes para compatibilidad con el endpoint
ALTER TABLE public.business_config 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es',
ADD COLUMN IF NOT EXISTS enable_inventory_tracking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true;

-- 7. Crear constraint único por organización (una configuración por organización)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_config_unique_org 
ON public.business_config(organization_id) 
WHERE organization_id IS NOT NULL;

-- 8. Comentarios para documentación
COMMENT ON COLUMN public.business_config.organization_id IS 
'ID de la organización a la que pertenece esta configuración. NULL para configuración global (solo SUPER_ADMIN)';

COMMENT ON TABLE public.business_config IS 
'Configuración global del sistema por organización. Cada organización tiene su propia configuración.';

-- =====================================================
-- Fin de la migración
-- =====================================================
