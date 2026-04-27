-- =====================================================
-- TRIGGER: Sincronización Automática auth.users → public.users
-- =====================================================
-- 
-- Este trigger sincroniza automáticamente los usuarios
-- cuando se crean en auth.users (Supabase Auth)
-- hacia public.users (nuestra aplicación)
--
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Crear función para manejar nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_org_id TEXT;
  user_full_name TEXT;
BEGIN
  -- Log para debugging
  RAISE LOG 'Trigger: Nuevo usuario creado en auth.users: %', NEW.email;
  
  -- Obtener organización por defecto
  SELECT id INTO default_org_id 
  FROM public.organizations 
  WHERE slug = 'default' 
  LIMIT 1;
  
  -- Si no existe organización por defecto, crearla
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (id, name, slug, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Organización Principal',
      'default',
      NOW(),
      NOW()
    )
    RETURNING id INTO default_org_id;
    
    RAISE LOG 'Trigger: Organización por defecto creada: %', default_org_id;
  END IF;
  
  -- Extraer nombre completo de metadata o usar email
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Usuario'
  );
  
  -- Crear usuario en public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    'CASHIER',  -- Rol por defecto
    default_org_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Evitar error si ya existe
  
  RAISE LOG 'Trigger: Usuario creado en public.users: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log del error pero no fallar el trigger
    RAISE WARNING 'Error en handle_new_user para %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear trigger que se ejecuta al crear usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Verificar que el trigger está activo
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 
-- 1. Este trigger se ejecuta DESPUÉS de crear un usuario en auth.users
-- 2. Crea automáticamente el perfil en public.users
-- 3. Asigna rol 'VIEWER' por defecto (puede cambiarse después)
-- 4. Asigna organización por defecto
-- 5. Si hay error, no falla la creación del usuario en auth
-- 
-- Para probar el trigger:
-- 1. Crear usuario en Supabase Dashboard > Authentication > Users
-- 2. Verificar que se creó en public.users:
--    SELECT * FROM public.users WHERE email = 'nuevo@email.com';
-- 
-- Para desactivar el trigger:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- 
-- Para ver logs del trigger:
-- SELECT * FROM pg_stat_statements WHERE query LIKE '%handle_new_user%';
-- =====================================================

-- 5. Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de sincronización creado exitosamente';
  RAISE NOTICE '   Trigger: on_auth_user_created';
  RAISE NOTICE '   Función: public.handle_new_user()';
  RAISE NOTICE '';
  RAISE NOTICE 'Ahora los usuarios creados en auth.users se sincronizarán';
  RAISE NOTICE 'automáticamente a public.users';
END $$;
