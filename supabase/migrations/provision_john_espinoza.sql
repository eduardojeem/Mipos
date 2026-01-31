-- Provision user John Eduardo Espinoza
-- 1. Create Organization and Subscription if user exists
DO $$
DECLARE
    target_email TEXT := 'johneduardoespinoza95@gmail.com';
    user_record RECORD;
    new_org_id UUID;
    premium_plan_id UUID;
    admin_role_id TEXT;
BEGIN
    -- Get Plan ID
    SELECT id INTO premium_plan_id FROM public.saas_plans WHERE slug = 'premium';
    -- Get Admin Role ID
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';

    -- Find User
    SELECT * INTO user_record FROM public.users WHERE email = target_email;

    IF user_record.id IS NOT NULL THEN
        -- Create Organization if not exists
        INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
        VALUES ('Empresa John Espinoza', 'john-espinoza-org', 'PREMIUM', 'ACTIVE')
        ON CONFLICT (slug) DO UPDATE SET subscription_plan = 'PREMIUM'
        RETURNING id INTO new_org_id;

        -- If updated (id not returned by returning if conflict?), select it
        IF new_org_id IS NULL THEN
            SELECT id INTO new_org_id FROM public.organizations WHERE slug = 'john-espinoza-org';
        END IF;

        -- Add Member
        INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
        VALUES (new_org_id, user_record.id, admin_role_id, TRUE)
        ON CONFLICT (organization_id, user_id) 
        DO UPDATE SET role_id = admin_role_id, is_owner = TRUE;

        -- Create Subscription
        INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
        VALUES (new_org_id, premium_plan_id, 'active', 'monthly')
        ON CONFLICT (organization_id) 
        DO UPDATE SET plan_id = premium_plan_id, status = 'active';

        -- Update User Role
        UPDATE public.users SET role = 'ADMIN' WHERE id = user_record.id;
        
        RAISE NOTICE 'User % provisioned successfully.', target_email;
    ELSE
        RAISE NOTICE 'User % not found. Logic will be handled by trigger on signup.', target_email;
    END IF;
END $$;

-- 2. Update Trigger Function to handle future signup
CREATE OR REPLACE FUNCTION public.handle_new_user_saas()
RETURNS TRIGGER AS $$
DECLARE
    default_org_id UUID;
    new_org_id UUID;
    super_admin_role_id TEXT;
    admin_role_id TEXT;
    premium_plan_id UUID;
BEGIN
    -- Insert into public.users
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 'CASHIER')
    ON CONFLICT (id) DO NOTHING;
    
    -- Specific logic for Super Admin
    IF NEW.email = 'jeem101595@gmail.com' THEN
        -- Get default org
        SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
        SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
        
        -- Add to org
        INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
        VALUES (default_org_id, NEW.id, super_admin_role_id, TRUE);
        
        -- Assign Role
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (NEW.id, super_admin_role_id, default_org_id);
        
        -- Update user table role
        UPDATE public.users SET role = 'ADMIN' WHERE id = NEW.id;

    -- Specific logic for John Eduardo Espinoza
    ELSIF NEW.email = 'johneduardoespinoza95@gmail.com' THEN
        -- Create Organization
        INSERT INTO public.organizations (name, slug, subscription_plan, subscription_status)
        VALUES ('Empresa John Espinoza', 'john-espinoza-org', 'PREMIUM', 'ACTIVE')
        RETURNING id INTO new_org_id;

        -- Get IDs
        SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';
        SELECT id INTO premium_plan_id FROM public.saas_plans WHERE slug = 'premium';

        -- Add Member
        INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
        VALUES (new_org_id, NEW.id, admin_role_id, TRUE);

        -- Create Subscription
        INSERT INTO public.saas_subscriptions (organization_id, plan_id, status, billing_cycle)
        VALUES (new_org_id, premium_plan_id, 'active', 'monthly');

        -- Update User Role
        UPDATE public.users SET role = 'ADMIN' WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
