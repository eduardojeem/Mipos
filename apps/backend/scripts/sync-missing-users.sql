-- =====================================================
-- Script: Sincronizar usuarios faltantes de auth.users → public.users
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================
-- Este script crea registros en public.users para todos los usuarios
-- de auth.users que no tienen registro en public.users todavía.
-- Útil cuando el trigger on_auth_user_created no estaba activo.
-- =====================================================

DO $$
DECLARE
  default_org_id UUID;
  inserted_count INT := 0;
BEGIN
  -- Obtener organización por defecto
  SELECT id INTO default_org_id
  FROM public.organizations
  WHERE slug = 'default'
  LIMIT 1;

  IF default_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró organización con slug "default". Crea una primero.';
  END IF;

  -- Insertar usuarios faltantes
  INSERT INTO public.users (id, email, full_name, role, organization_id, created_at, updated_at)
  SELECT
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(au.email, '@', 1),
      'Usuario'
    ),
    'CASHIER',
    default_org_id,
    au.created_at,
    NOW()
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
  );

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE '✅ Usuarios sincronizados: %', inserted_count;
END $$;

-- Verificar resultado
SELECT 
  au.id,
  au.email,
  pu.full_name,
  pu.organization_id,
  CASE WHEN pu.id IS NOT NULL THEN '✅ Sincronizado' ELSE '❌ Faltante' END AS estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;
