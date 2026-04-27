CREATE OR REPLACE FUNCTION public.update_superadmin_settings_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.fn_log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := null;
BEGIN
  BEGIN
    v_user := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', null)::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user := null;
  END;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'INSERT', v_user, to_jsonb(NEW), (NEW).organization_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'UPDATE', v_user, to_jsonb(NEW), (NEW).organization_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    VALUES (TG_TABLE_NAME, coalesce((OLD).id::text, ''), 'DELETE', v_user, to_jsonb(OLD), (OLD).organization_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_saas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_org_id UUID;
  super_admin_role_id TEXT;
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'), 'CASHIER')
  ON CONFLICT (id) DO NOTHING;
  IF NEW.email = 'jeem101595@gmail.com' THEN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN';
    INSERT INTO public.organization_members (organization_id, user_id, role_id, is_owner)
    VALUES (default_org_id, NEW.id, super_admin_role_id, TRUE);
    INSERT INTO public.user_roles (user_id, role_id, organization_id)
    VALUES (NEW.id, super_admin_role_id, default_org_id);
    UPDATE public.users SET role = 'ADMIN' WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_system_settings_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.fn_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA
      AND table_name = TG_TABLE_NAME
      AND column_name = 'deleted_at'
  ) THEN
    EXECUTE format('update %I.%I set deleted_at = now() where id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      USING OLD.id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_carousel_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.promotions_carousel WHERE organization_id = NEW.organization_id) >= 10 THEN
    RAISE EXCEPTION 'Máximo 10 items permitidos en el carrusel por organización';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;
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
$$;

DROP FUNCTION IF EXISTS public.exec_sql(text);
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql;
  SELECT json_build_object('status', 'success', 'message', 'SQL executed successfully') INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    SELECT json_build_object('status','error','message',SQLERRM,'code',SQLSTATE) INTO result;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid uuid)
RETURNS TABLE (permission_name text, resource text, action text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT p.name AS permission_name, p.resource, p.action
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.is_active = true
    AND ur.user_id = user_uuid;
END;
$$;
