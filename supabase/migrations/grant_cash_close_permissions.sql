BEGIN;

-- Activar roles estándar
UPDATE public.roles SET is_active = true WHERE name IN ('CASHIER','MANAGER','ADMIN','SUPER_ADMIN');

-- Crear permiso cash:close si no existe
INSERT INTO public.permissions (name, display_name, description, resource, action, is_active)
SELECT 'cash:close', 'Cerrar caja', 'Permite cerrar una sesión de caja', 'cash', 'close', true
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'cash:close');

-- Conceder a CASHIER
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'CASHIER' AND p.name = 'cash:close'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Conceder a MANAGER
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'MANAGER' AND p.name = 'cash:close'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Conceder a ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'ADMIN' AND p.name = 'cash:close'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Conceder a SUPER_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'SUPER_ADMIN' AND p.name = 'cash:close'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;

