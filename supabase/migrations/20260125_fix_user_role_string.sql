-- Fix user role in public.users to be SUPER_ADMIN for the specific user
UPDATE public.users
SET role = 'SUPER_ADMIN'
WHERE email = 'jeem101595@gmail.com';

-- Ensure the role exists in roles table just in case
INSERT INTO public.roles (name, display_name, description, is_system_role)
VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acceso total al sistema', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Ensure the user_roles mapping exists
DO $$
DECLARE
    target_user_id UUID;
    super_admin_role_id TEXT;
    default_org_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM public.users WHERE email = 'jeem101595@gmail.com';
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    IF target_user_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (target_user_id, super_admin_role_id, default_org_id)
        ON CONFLICT (user_id, role_id) DO UPDATE SET organization_id = default_org_id;
        
        -- Also update organization_members
        UPDATE public.organization_members
        SET role_id = super_admin_role_id
        WHERE user_id = target_user_id;
    END IF;
END $$;
