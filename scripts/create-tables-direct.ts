import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 CREANDO TABLAS DEL SISTEMA DE ROLES');
  console.log('=====================================');
  
  const tables = [
    {
      name: 'roles',
      sql: `
        CREATE TABLE IF NOT EXISTS public.roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) UNIQUE NOT NULL,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          is_system_role BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    },
    {
      name: 'permissions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) UNIQUE NOT NULL,
          display_name VARCHAR(150) NOT NULL,
          description TEXT,
          resource VARCHAR(50) NOT NULL,
          action VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(resource, action)
        );
      `
    },
    {
      name: 'user_roles',
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role_id UUID NOT NULL,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          assigned_by UUID REFERENCES auth.users(id),
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          UNIQUE(user_id, role_id)
        );
      `
    },
    {
      name: 'role_permissions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.role_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          role_id UUID NOT NULL,
          permission_id UUID NOT NULL,
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          granted_by UUID,
          UNIQUE(role_id, permission_id)
        );
      `
    }
  ];

  let successCount = 0;
  
  for (const table of tables) {
    try {
      console.log(`⏳ Creando tabla '${table.name}'...`);
      
      // Intentar crear la tabla usando una consulta SQL directa
      const { error } = await supabase
        .from('_temp_table_creation')
        .select('*')
        .limit(0);
      
      // Si la consulta anterior falla, intentamos crear usando el método alternativo
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          sql: table.sql
        })
      });
      
      if (response.ok) {
        console.log(`✅ Tabla '${table.name}' creada exitosamente`);
        successCount++;
      } else {
        const errorText = await response.text();
        console.log(`❌ Error creando tabla '${table.name}':`, errorText);
      }
      
    } catch (err) {
      console.log(`❌ Excepción creando tabla '${table.name}':`, err);
    }
  }
  
  console.log(`\n📊 RESUMEN: ${successCount}/${tables.length} tablas creadas`);
  
  // Insertar datos iniciales
  if (successCount > 0) {
    await insertInitialData();
  }
}

async function insertInitialData() {
  console.log('\n📋 INSERTANDO DATOS INICIALES...');
  
  try {
    // Insertar roles predeterminados
    const { error: rolesError } = await supabase
      .from('roles')
      .upsert([
        {
          name: 'ADMIN',
          display_name: 'Administrador',
          description: 'Acceso completo al sistema',
          is_system_role: true
        },
        {
          name: 'MANAGER',
          display_name: 'Gerente',
          description: 'Gestión de inventario y ventas',
          is_system_role: true
        },
        {
          name: 'CASHIER',
          display_name: 'Cajero',
          description: 'Operaciones de venta',
          is_system_role: true
        },
        {
          name: 'VIEWER',
          display_name: 'Visualizador',
          description: 'Solo lectura',
          is_system_role: true
        }
      ], { onConflict: 'name' });
    
    if (!rolesError) {
      console.log('✅ Roles predeterminados insertados');
    } else {
      console.log('❌ Error insertando roles:', rolesError.message);
    }
    
    // Insertar permisos básicos
    const { error: permissionsError } = await supabase
      .from('permissions')
      .upsert([
        {
          name: 'users:read',
          display_name: 'Ver Usuarios',
          description: 'Ver información de usuarios',
          resource: 'users',
          action: 'read'
        },
        {
          name: 'users:create',
          display_name: 'Crear Usuarios',
          description: 'Crear nuevos usuarios',
          resource: 'users',
          action: 'create'
        },
        {
          name: 'products:read',
          display_name: 'Ver Productos',
          description: 'Ver información de productos',
          resource: 'products',
          action: 'read'
        },
        {
          name: 'sales:create',
          display_name: 'Crear Ventas',
          description: 'Realizar ventas',
          resource: 'sales',
          action: 'create'
        }
      ], { onConflict: 'name' });
    
    if (!permissionsError) {
      console.log('✅ Permisos básicos insertados');
    } else {
      console.log('❌ Error insertando permisos:', permissionsError.message);
    }
    
  } catch (err) {
    console.log('❌ Error insertando datos iniciales:', err);
  }
}

createTables().catch(console.error);