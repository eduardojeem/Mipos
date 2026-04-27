BEGIN;
UPDATE public.roles SET is_active = true WHERE name IN ('CASHIER','MANAGER','ADMIN','SUPER_ADMIN');
INSERT INTO public.permissions (name, display_name, description, resource, action, is_active)
SELECT 'cash:open', 'Abrir caja', 'Permite abrir una sesión de caja', 'cash', 'open', true
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'cash:open');
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'CASHIER' AND p.name = 'cash:open'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'MANAGER' AND p.name = 'cash:open'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
COMMIT;
