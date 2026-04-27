BEGIN;

-- Link existing 'sales:create' (by resource/action) to roles if missing
WITH perm AS (
  SELECT id FROM public.permissions WHERE resource = 'sales' AND action = 'create' LIMIT 1
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, perm p
WHERE r.name IN ('CASHIER','MANAGER','ADMIN','SUPER_ADMIN')
AND NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMIT;

