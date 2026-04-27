BEGIN;
UPDATE public.roles SET is_active = true WHERE name IN ('ADMIN','SUPER_ADMIN');

-- Asegurar que el permiso canónico exista
INSERT INTO public.permissions (name, display_name, description, resource, action, is_active)
SELECT 'cash:open', 'Abrir caja', 'Permite abrir una sesión de caja', 'cash', 'open', true
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'cash:open');

-- Asignar permiso a ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name = 'cash:open'
WHERE r.name = 'ADMIN'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Asignar permiso a SUPER_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name = 'cash:open'
WHERE r.name = 'SUPER_ADMIN'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;
