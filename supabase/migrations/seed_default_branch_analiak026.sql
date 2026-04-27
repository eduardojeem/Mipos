-- Ensure at least one branch exists for analiak026@gmail.com organization

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_slug text;
BEGIN
  SELECT u.id,
         COALESCE(
           u.organization_id,
           (
             SELECT om.organization_id
             FROM public.organization_members om
             WHERE om.user_id = u.id AND om.organization_id IS NOT NULL
             ORDER BY om.created_at NULLS LAST
             LIMIT 1
           )
         )
  INTO v_user_id, v_org_id
  FROM public.users u
  WHERE lower(u.email) = 'analiak026@gmail.com'
  ORDER BY u.created_at NULLS LAST
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found for analiak026@gmail.com';
  END IF;

  IF EXISTS (SELECT 1 FROM public.branches b WHERE b.organization_id = v_org_id) THEN
    RETURN;
  END IF;

  v_slug := 'central';

  INSERT INTO public.branches (organization_id, name, slug, address, phone, is_active)
  VALUES (
    v_org_id,
    'Central',
    v_slug,
    'Av. Principal 123, Asunción, PY',
    '+595981000000',
    true
  );
END $$;

NOTIFY pgrst, 'reload schema';

