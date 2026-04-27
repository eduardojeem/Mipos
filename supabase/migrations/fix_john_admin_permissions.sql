-- Script para asegurar que johneduardoespinoza95@gmail.com tenga permisos de ADMIN

DO $$
DECLARE
  v_auth_id UUID;
  v_admin_role_id INT;
  v_existing_user_role_id INT;
BEGIN
  -- 1. Obtener ID del usuario de auth.users
  SELECT id INTO v_auth_id 
  FROM auth.users 
  WHERE email = 'johneduardoespinoza95@gmail.com';
  
  IF v_auth_id IS NULL THEN
    RAISE NOTICE '❌ Usuario no encontrado en auth.users';
    RAISE NOTICE 'El usuario debe registrarse primero en la aplicación';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado en auth.users: %', v_auth_id;
  
  -- 2. Asegurar que existe en public.users
  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES (
    v_auth_id,
    'johneduardoespinoza95@gmail.com',
    'John Eduardo Espinoza',
    'ADMIN',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    role = 'ADMIN',
    full_name = COALESCE(public.users.full_name, 'John Eduardo Espinoza'),
    email = 'johneduardoespinoza95@gmail.com',
    updated_at = NOW();
  
  RAISE NOTICE '✅ Usuario actualizado en public.users con rol ADMIN';
  
  -- 3. Obtener o crear rol ADMIN
  SELECT id INTO v_admin_role_id 
  FROM public.roles 
  WHERE name = 'ADMIN' OR name = 'admin';
  
  IF v_admin_role_id IS NULL THEN
    -- Crear rol ADMIN si no existe
    INSERT INTO public.roles (
      name,
      display_name,
      description,
      is_system_role,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      'ADMIN',
      'Administrator',
      'Full system administrator with all permissions',
      true,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_admin_role_id;
    
    RAISE NOTICE '✅ Rol ADMIN creado: %', v_admin_role_id;
    
    -- Asignar todos los permisos al rol ADMIN
    INSERT INTO public.role_permissions (role_id, permission_id, granted_at, is_active)
    SELECT 
      v_admin_role_id,
      p.id,
      NOW(),
      true
    FROM public.permissions p
    WHERE p.is_active = true
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE '✅ Permisos asignados al rol ADMIN';
  ELSE
    RAISE NOTICE '✅ Rol ADMIN encontrado: %', v_admin_role_id;
  END IF;
  
  -- 4. Verificar si ya existe asignación de rol
  SELECT id INTO v_existing_user_role_id
  FROM public.user_roles
  WHERE user_id = v_auth_id::text
  AND role_id = v_admin_role_id;
  
  IF v_existing_user_role_id IS NULL THEN
    -- Crear asignación de rol
    INSERT INTO public.user_roles (
      user_id,
      role_id,
      assigned_at,
      is_active
    )
    VALUES (
      v_auth_id::text,
      v_admin_role_id,
      NOW(),
      true
    );
    
    RAISE NOTICE '✅ Rol ADMIN asignado al usuario';
  ELSE
    -- Actualizar asignación existente para asegurar que está activa
    UPDATE public.user_roles
    SET 
      is_active = true,
      assigned_at = NOW()
    WHERE id = v_existing_user_role_id;
    
    RAISE NOTICE '✅ Asignación de rol ADMIN actualizada';
  END IF;
  
  -- 5. Resumen final
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuario: johneduardoespinoza95@gmail.com';
  RAISE NOTICE 'ID: %', v_auth_id;
  RAISE NOTICE 'Rol en public.users: ADMIN';
  RAISE NOTICE 'Rol asignado: ADMIN (ID: %)', v_admin_role_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar sesión';
  RAISE NOTICE 'para que los cambios surtan efecto.';
  RAISE NOTICE '========================================';
  
END $$;

-- Verificar resultado
SELECT 
  u.email,
  u.role as user_table_role,
  r.name as assigned_role,
  r.display_name,
  ur.is_active as role_active,
  COUNT(DISTINCT p.id) as permission_count
FROM public.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.role_permissions rp ON rp.role_id = r.id AND rp.is_active = true
LEFT JOIN public.permissions p ON p.id = rp.permission_id AND p.is_active = true
WHERE u.email = 'johneduardoespinoza95@gmail.com'
GROUP BY u.email, u.role, r.name, r.display_name, ur.is_active;
