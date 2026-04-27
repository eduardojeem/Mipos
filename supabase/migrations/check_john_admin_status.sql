-- Script para verificar el estado de admin de johneduardoespinoza95@gmail.com

-- 1. Verificar usuario en auth.users
SELECT 
  'AUTH USER' as source,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'johneduardoespinoza95@gmail.com';

-- 2. Verificar usuario en public.users
SELECT 
  'PUBLIC USER' as source,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users 
WHERE email = 'johneduardoespinoza95@gmail.com';

-- 3. Verificar roles asignados al usuario
SELECT 
  'USER ROLES' as source,
  ur.id,
  ur.user_id,
  ur.role_id,
  r.name as role_name,
  r.display_name,
  ur.is_active,
  ur.assigned_at
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.user_id IN (
  SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com'
)
ORDER BY ur.assigned_at DESC;

-- 4. Verificar permisos de los roles asignados
SELECT 
  'ROLE PERMISSIONS' as source,
  r.name as role_name,
  p.resource,
  p.action,
  p.display_name as permission_name,
  r.is_active as role_active,
  p.is_active as permission_active
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
JOIN public.role_permissions rp ON rp.role_id = r.id
JOIN public.permissions p ON p.id = rp.permission_id
WHERE ur.user_id IN (
  SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com'
)
AND ur.is_active = true
AND r.is_active = true
AND p.is_active = true
ORDER BY r.name, p.resource, p.action;

-- 5. Verificar membresías de organización
SELECT 
  'ORG MEMBERSHIP' as source,
  om.id,
  om.user_id,
  om.organization_id,
  o.name as org_name,
  o.slug as org_slug,
  om.role_id,
  om.created_at
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.user_id IN (
  SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com'
);

-- 6. Resumen de permisos
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id IN (SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com')
      AND r.name IN ('ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin')
      AND ur.is_active = true
    ) THEN '✅ Usuario tiene rol de ADMIN asignado'
    ELSE '❌ Usuario NO tiene rol de ADMIN asignado'
  END as admin_status;

-- 7. Contar permisos totales
SELECT 
  COUNT(DISTINCT p.id) as total_permissions
FROM public.user_roles ur
JOIN public.role_permissions rp ON rp.role_id = ur.role_id
JOIN public.permissions p ON p.id = rp.permission_id
JOIN public.roles r ON r.id = ur.role_id
WHERE ur.user_id IN (
  SELECT id FROM auth.users WHERE email = 'johneduardoespinoza95@gmail.com'
)
AND ur.is_active = true
AND r.is_active = true
AND p.is_active = true;
