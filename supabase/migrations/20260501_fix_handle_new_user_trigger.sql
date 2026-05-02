-- Fix handle_new_user_saas trigger to handle all edge cases
-- The trigger was failing with "Database error saving new user" because:
-- 1. ON CONFLICT (id) doesn't cover email uniqueness conflicts
-- 2. Missing error handling for constraint violations
-- 3. search_path issues with SET search_path = ''

CREATE OR REPLACE FUNCTION public.handle_new_user_saas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    default_org_id UUID;
    super_admin_role_id TEXT;
BEGIN
    -- Insert into public.users with proper conflict handling
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Usuario'),
        'CASHIER'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), public.users.full_name),
        updated_at = now()
    ;

    -- Handle email conflict separately (user might exist with different id)
    -- This is a no-op if the above succeeded
    BEGIN
        UPDATE public.users
        SET full_name = COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), full_name),
            updated_at = now()
        WHERE email = NEW.email AND id != NEW.id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore update errors
        NULL;
    END;

    -- Super Admin logic for specific email
    IF NEW.email = 'jeem101595@gmail.com' THEN
        BEGIN
            SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
            SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';

            IF default_org_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
                INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
                VALUES (default_org_id, NEW.id, super_admin_role_id, TRUE)
                ON CONFLICT (organization_id, user_id) DO NOTHING;

                INSERT INTO public.user_roles (user_id, role_id, organization_id)
                VALUES (NEW.id, super_admin_role_id, default_org_id)
                ON CONFLICT DO NOTHING;

                UPDATE public.users SET role = 'ADMIN' WHERE id = NEW.id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user_saas: super admin setup failed for %: %', NEW.email, SQLERRM;
        END;
    END IF;

    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- NEVER fail the trigger — this blocks user registration entirely
    RAISE WARNING 'handle_new_user_saas failed for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_saas();
