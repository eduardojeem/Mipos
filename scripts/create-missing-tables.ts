import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createMissingTables() {
  console.log('🔧 Creating missing role system tables...\n');
  
  try {
    // 1. Create roles table
    console.log('1️⃣ Creating roles table...');
    const { data: rolesResult, error: rolesError } = await supabase
      .from('roles')
      .select('count')
      .limit(1);
    
    if (rolesError && rolesError.code === 'PGRST116') {
      console.log('   Creating roles table...');
      const { error: createRolesError } = await supabase.rpc('exec_sql', {
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
      });
      
      if (createRolesError) {
        console.log('❌ Error creating roles table:', createRolesError);
      } else {
        console.log('✅ Roles table created successfully');
      }
    } else {
      console.log('✅ Roles table already exists');
    }
    
    // 2. Create permissions table
    console.log('\n2️⃣ Creating permissions table...');
    const { data: permissionsResult, error: permissionsError } = await supabase
      .from('permissions')
      .select('count')
      .limit(1);
    
    if (permissionsError && permissionsError.code === 'PGRST116') {
      console.log('   Creating permissions table...');
      const { error: createPermissionsError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) UNIQUE NOT NULL,
            resource VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (createPermissionsError) {
        console.log('❌ Error creating permissions table:', createPermissionsError);
      } else {
        console.log('✅ Permissions table created successfully');
      }
    } else {
      console.log('✅ Permissions table already exists');
    }
    
    // 3. Create user_roles table
    console.log('\n3️⃣ Creating user_roles table...');
    const { data: userRolesResult, error: userRolesError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);
    
    if (userRolesError && userRolesError.code === 'PGRST116') {
      console.log('   Creating user_roles table...');
      const { error: createUserRolesError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            role_id UUID NOT NULL,
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            assigned_by UUID,
            expires_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT true,
            FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
            UNIQUE(user_id, role_id)
          );
        `
      });
      
      if (createUserRolesError) {
        console.log('❌ Error creating user_roles table:', createUserRolesError);
      } else {
        console.log('✅ User_roles table created successfully');
      }
    } else {
      console.log('✅ User_roles table already exists');
    }
    
    // 4. Create role_permissions table
    console.log('\n4️⃣ Creating role_permissions table...');
    const { data: rolePermissionsResult, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select('count')
      .limit(1);
    
    if (rolePermissionsError && rolePermissionsError.code === 'PGRST116') {
      console.log('   Creating role_permissions table...');
      const { error: createRolePermissionsError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role_id UUID NOT NULL,
            permission_id UUID NOT NULL,
            granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            granted_by UUID,
            is_active BOOLEAN DEFAULT true,
            FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE,
            UNIQUE(role_id, permission_id)
          );
        `
      });
      
      if (createRolePermissionsError) {
        console.log('❌ Error creating role_permissions table:', createRolePermissionsError);
      } else {
        console.log('✅ Role_permissions table created successfully');
      }
    } else {
      console.log('✅ Role_permissions table already exists');
    }
    
    // 5. Insert default roles
    console.log('\n5️⃣ Inserting default roles...');
    const defaultRoles = [
      { name: 'ADMIN', display_name: 'Administrador', description: 'Acceso completo al sistema', is_system_role: true },
      { name: 'MANAGER', display_name: 'Gerente', description: 'Gestión de inventario y reportes', is_system_role: true },
      { name: 'CASHIER', display_name: 'Cajero', description: 'Operaciones de venta básicas', is_system_role: true },
      { name: 'EMPLOYEE', display_name: 'Empleado', description: 'Acceso limitado al sistema', is_system_role: true }
    ];
    
    for (const role of defaultRoles) {
      const { error: insertRoleError } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' });
      
      if (insertRoleError) {
        console.log(`❌ Error inserting role ${role.name}:`, insertRoleError);
      } else {
        console.log(`✅ Role ${role.name} inserted/updated`);
      }
    }
    
    // 6. Insert default permissions
    console.log('\n6️⃣ Inserting default permissions...');
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
      
      // Reports permissions
      { name: 'reports.view', resource: 'reports', action: 'view', description: 'Ver reportes' },
      
      // System permissions
      { name: 'system.settings', resource: 'system', action: 'settings', description: 'Configuración del sistema' }
    ];
    
    for (const permission of defaultPermissions) {
      const { error: insertPermissionError } = await supabase
        .from('permissions')
        .upsert(permission, { onConflict: 'name' });
      
      if (insertPermissionError) {
        console.log(`❌ Error inserting permission ${permission.name}:`, insertPermissionError);
      } else {
        console.log(`✅ Permission ${permission.name} inserted/updated`);
      }
    }
    
    console.log('\n🎉 Table creation and data insertion completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createMissingTables().catch(console.error);