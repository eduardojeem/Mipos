import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRolesTables() {
  console.log('🔧 Creando tablas de roles en Supabase...\n');

  try {
    // 1. Crear tabla roles
    console.log('1. Creando tabla roles...');
    const { data: rolesResult, error: rolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.roles (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          name VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          is_system_role BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura a usuarios autenticados
        CREATE POLICY IF NOT EXISTS "Allow read access to roles" ON public.roles
          FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Política para permitir escritura a service_role
        CREATE POLICY IF NOT EXISTS "Allow full access to service_role" ON public.roles
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (rolesError) {
      console.error('❌ Error creando tabla roles:', rolesError);
    } else {
      console.log('✅ Tabla roles creada exitosamente');
    }

    // 2. Crear tabla permissions
    console.log('2. Creando tabla permissions...');
    const { data: permissionsResult, error: permissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.permissions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          name VARCHAR(100) UNIQUE NOT NULL,
          resource VARCHAR(50) NOT NULL,
          action VARCHAR(50) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura a usuarios autenticados
        CREATE POLICY IF NOT EXISTS "Allow read access to permissions" ON public.permissions
          FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Política para permitir escritura a service_role
        CREATE POLICY IF NOT EXISTS "Allow full access to service_role" ON public.permissions
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (permissionsError) {
      console.error('❌ Error creando tabla permissions:', permissionsError);
    } else {
      console.log('✅ Tabla permissions creada exitosamente');
    }

    // 3. Crear tabla role_permissions
    console.log('3. Creando tabla role_permissions...');
    const { data: rolePermissionsResult, error: rolePermissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.role_permissions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          role_id TEXT NOT NULL,
          permission_id TEXT NOT NULL,
          granted_at TIMESTAMPTZ DEFAULT NOW(),
          granted_by TEXT,
          is_active BOOLEAN DEFAULT true,
          CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
          CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
          CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
        );
        
        -- Habilitar RLS
        ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura a usuarios autenticados
        CREATE POLICY IF NOT EXISTS "Allow read access to role_permissions" ON public.role_permissions
          FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Política para permitir escritura a service_role
        CREATE POLICY IF NOT EXISTS "Allow full access to service_role" ON public.role_permissions
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (rolePermissionsError) {
      console.error('❌ Error creando tabla role_permissions:', rolePermissionsError);
    } else {
      console.log('✅ Tabla role_permissions creada exitosamente');
    }

    // 4. Crear tabla user_roles
    console.log('4. Creando tabla user_roles...');
    const { data: userRolesResult, error: userRolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          user_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          assigned_by TEXT,
          expires_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT true,
          CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
          CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
          CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
        );
        
        -- Habilitar RLS
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura a usuarios autenticados
        CREATE POLICY IF NOT EXISTS "Allow read access to user_roles" ON public.user_roles
          FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Política para permitir escritura a service_role
        CREATE POLICY IF NOT EXISTS "Allow full access to service_role" ON public.user_roles
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (userRolesError) {
      console.error('❌ Error creando tabla user_roles:', userRolesError);
    } else {
      console.log('✅ Tabla user_roles creada exitosamente');
    }

    console.log('\n🎉 Proceso de creación de tablas completado!');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

createRolesTables();