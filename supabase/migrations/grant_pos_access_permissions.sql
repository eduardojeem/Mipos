BEGIN;

-- Ensure roles are active
UPDATE public.roles SET is_active = true WHERE name IN ('CASHIER','MANAGER','ADMIN','SUPER_ADMIN');

-- Ensure permission exists
INSERT INTO public.permissions (name, display_name, description, resource, action, is_active)
SELECT 'pos:access', 'POS Access', 'Permite acceder y operar el POS', 'pos', 'access', true
WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE name = 'pos:access');

-- Grant to CASHIER
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'CASHIER' AND p.name = 'pos:access'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant to MANAGER
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'MANAGER' AND p.name = 'pos:access'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant to ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'ADMIN' AND p.name = 'pos:access'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant to SUPER_ADMIN
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'SUPER_ADMIN' AND p.name = 'pos:access'
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;

