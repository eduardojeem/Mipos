import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRolesWithInsert() {
  console.log('🔧 Creando datos de roles en Supabase usando inserts directos...\n');

  try {
    // Primero, intentar insertar roles directamente
    console.log('1. Insertando roles predeterminados...');
    
    const defaultRoles = [
      {
        id: 'admin-role-id',
        name: 'ADMIN',
        display_name: 'Administrador',
        description: 'Acceso completo al sistema',
        is_system_role: true,
        is_active: true
      },
      {
        id: 'manager-role-id',
        name: 'MANAGER',
        display_name: 'Gerente',
        description: 'Gestión de inventario y reportes',
        is_system_role: true,
        is_active: true
      },
      {
        id: 'cashier-role-id',
        name: 'CASHIER',
        display_name: 'Cajero',
        description: 'Operaciones de venta básicas',
        is_system_role: true,
        is_active: true
      },
      {
        id: 'employee-role-id',
        name: 'EMPLOYEE',
        display_name: 'Empleado',
        description: 'Acceso limitado al sistema',
        is_system_role: true,
        is_active: true
      }
    ];

    // Intentar crear la tabla roles usando una consulta directa
    const { data: createRolesTable, error: createRolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(1);

    if (createRolesError && createRolesError.code === 'PGRST116') {
      console.log('⚠️  La tabla roles no existe. Necesita ser creada manualmente en Supabase.');
      console.log('📋 SQL para crear la tabla roles:');
      console.log(`
CREATE TABLE public.roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "Allow full access to service_role" ON public.roles
  FOR ALL USING (auth.role() = 'service_role');
      `);
      return;
    }

    // Si la tabla existe, insertar roles
    for (const role of defaultRoles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' });

      if (error) {
        console.error(`❌ Error insertando rol ${role.name}:`, error);
      } else {
        console.log(`✅ Rol ${role.name} insertado/actualizado exitosamente`);
      }
    }

    // 2. Insertar permisos predeterminados
    console.log('\n2. Insertando permisos predeterminados...');
    
    const defaultPermissions = [
      // User permissions
      { name: 'users.read', resource: 'users', action: 'read', description: 'Ver usuarios' },
      { name: 'users.create', resource: 'users', action: 'create', description: 'Crear usuarios' },
      { name: 'users.update', resource: 'users', action: 'update', description: 'Actualizar usuarios' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: 'Eliminar usuarios' },
      
      // Product permissions
      { name: 'products.read', resource: 'products', action: 'read', description: 'Ver productos' },
      { name: 'products.create', resource: 'products', action: 'create', description: 'Crear productos' },
      { name: 'products.update', resource: 'products', action: 'update', description: 'Actualizar productos' },
      { name: 'products.delete', resource: 'products', action: 'delete', description: 'Eliminar productos' },
      
      // Sales permissions
      { name: 'sales.read', resource: 'sales', action: 'read', description: 'Ver ventas' },
      { name: 'sales.create', resource: 'sales', action: 'create', description: 'Crear ventas' },
      { name: 'sales.update', resource: 'sales', action: 'update', description: 'Actualizar ventas' },
      { name: 'sales.delete', resource: 'sales', action: 'delete', description: 'Eliminar ventas' },
      
      // Reports permissions
      { name: 'reports.view', resource: 'reports', action: 'view', description: 'Ver reportes' },
      { name: 'reports.export', resource: 'reports', action: 'export', description: 'Exportar reportes' },
      
      // System permissions
      { name: 'system.settings', resource: 'system', action: 'settings', description: 'Configurar sistema' },
      { name: 'system.backup', resource: 'system', action: 'backup', description: 'Realizar respaldos' }
    ];

    // Verificar si la tabla permissions existe
    const { data: createPermissionsTable, error: createPermissionsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(1);

    if (createPermissionsError && createPermissionsError.code === 'PGRST116') {
      console.log('⚠️  La tabla permissions no existe. Necesita ser creada manualmente en Supabase.');
      console.log('📋 SQL para crear la tabla permissions:');
      console.log(`
CREATE TABLE public.permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to permissions" ON public.permissions
  FOR SELECT USING (true);

CREATE POLICY "Allow full access to service_role" ON public.permissions
  FOR ALL USING (auth.role() = 'service_role');
      `);
      return;
    }

    // Si la tabla existe, insertar permisos
    for (const permission of defaultPermissions) {
      const { data, error } = await supabase
        .from('permissions')
        .upsert(permission, { onConflict: 'name' });

      if (error) {
        console.error(`❌ Error insertando permiso ${permission.name}:`, error);
      } else {
        console.log(`✅ Permiso ${permission.name} insertado/actualizado exitosamente`);
      }
    }

    console.log('\n🎉 Proceso completado! Verifica las tablas en Supabase Dashboard.');

  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

createRolesWithInsert();