-- Inserta permisos básicos por categoría (usuarios, productos, ventas, reportes, configuración, sistema)
DO $$
BEGIN
  -- Usuarios
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'users:view', 'Ver usuarios', 'Puede ver la lista de usuarios', 'users', 'view', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'users:create', 'Crear usuarios', 'Puede crear usuarios', 'users', 'create', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'users:update', 'Actualizar usuarios', 'Puede actualizar usuarios', 'users', 'update', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'users:delete', 'Eliminar usuarios', 'Puede eliminar usuarios', 'users', 'delete', true, now(), now())
  ON CONFLICT (name) DO NOTHING;

  -- Productos
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'products:view', 'Ver productos', 'Puede ver productos', 'products', 'view', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'products:create', 'Crear productos', 'Puede crear productos', 'products', 'create', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'products:update', 'Actualizar productos', 'Puede actualizar productos', 'products', 'update', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'products:delete', 'Eliminar productos', 'Puede eliminar productos', 'products', 'delete', true, now(), now())
  ON CONFLICT (name) DO NOTHING;

  -- Ventas
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'sales:view', 'Ver ventas', 'Puede ver ventas', 'sales', 'view', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'sales:create', 'Registrar ventas', 'Puede registrar ventas', 'sales', 'create', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'sales:refund', 'Reembolsar ventas', 'Puede gestionar devoluciones', 'sales', 'refund', true, now(), now())
  ON CONFLICT (name) DO NOTHING;

  -- Reportes
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'reports:view', 'Ver reportes', 'Puede ver reportes y estadísticas', 'reports', 'view', true, now(), now())
  ON CONFLICT (name) DO NOTHING;

  -- Configuración
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'settings:update', 'Actualizar configuración', 'Puede modificar configuración de la empresa', 'settings', 'update', true, now(), now())
  ON CONFLICT (name) DO NOTHING;

  -- Sistema
  INSERT INTO public.permissions (id, name, display_name, description, resource, action, is_active, created_at, updated_at)
  VALUES (gen_random_uuid()::text, 'system:admin', 'Administración del sistema', 'Acceso a tareas avanzadas del sistema', 'system', 'admin', true, now(), now())
  ON CONFLICT (name) DO NOTHING;
END $$;
