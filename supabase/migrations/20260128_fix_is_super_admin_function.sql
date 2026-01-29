-- Update is_super_admin function to check both user_roles table and users.role column
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check user_roles table (RBAC)
    IF EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.name = 'SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Fallback: Check users table (Simple Role)
    -- We cast to text to avoid enum issues if the column type changes or just for safety comparison
    IF EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = auth.uid() 
        AND role::text = 'SUPER_ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
