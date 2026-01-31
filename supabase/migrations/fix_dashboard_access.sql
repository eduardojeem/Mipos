-- Fix Dashboard and Promotions Access
-- 1. Ensure public.users has RLS enabled and policies for self-read (Crucial for identifying role)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Update own profile" ON public.users;
CREATE POLICY "Update own profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Insert missing permissions
INSERT INTO public.permissions (name, resource, action, display_name, description)
VALUES 
    -- Dashboard (layout requires dashboard:read)
    ('dashboard:read', 'dashboard', 'read', 'Ver Dashboard', 'Acceso de lectura al panel principal'),
    -- Promotions (page requires promotions:view)
    ('promotions:view', 'promotions', 'view', 'Ver Promociones', 'Ver lista de promociones'),
    ('promotions:create', 'promotions', 'create', 'Crear Promociones', 'Crear nuevas promociones'),
    ('promotions:update', 'promotions', 'update', 'Editar Promociones', 'Editar promociones existentes'),
    ('promotions:delete', 'promotions', 'delete', 'Eliminar Promociones', 'Eliminar promociones')
ON CONFLICT (name) DO NOTHING;

-- 3. Assign permissions to roles
-- ADMIN gets everything
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'ADMIN' 
  AND p.name IN ('dashboard:read', 'promotions:view', 'promotions:create', 'promotions:update', 'promotions:delete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER gets dashboard and promotions read/write
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'MANAGER' 
  AND p.name IN ('dashboard:read', 'promotions:view', 'promotions:create', 'promotions:update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CASHIER gets dashboard read and promotions view
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p 
WHERE r.name = 'CASHIER' 
  AND p.name IN ('dashboard:read', 'promotions:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Ensure John Espinoza is ADMIN
DO $$
DECLARE
    target_email TEXT := 'johneduardoespinoza95@gmail.com';
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM public.users WHERE email = target_email;
    
    IF user_id IS NOT NULL THEN
        UPDATE public.users SET role = 'ADMIN' WHERE id = user_id;
    END IF;
END $$;
