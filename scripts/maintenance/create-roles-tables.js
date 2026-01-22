const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRolesTables() {
  try {
    console.log('Creating roles and permissions tables...');

    // Create roles table
    const { error: rolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          is_system_role BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (rolesError) {
      console.error('Error creating roles table:', rolesError);
    } else {
      console.log('✓ Roles table created successfully');
    }

    // Create permissions table
    const { error: permissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS permissions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          resource TEXT NOT NULL,
          action TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (permissionsError) {
      console.error('Error creating permissions table:', permissionsError);
    } else {
      console.log('✓ Permissions table created successfully');
    }

    // Create user_roles table
    const { error: userRolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_roles (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          user_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          assigned_at TIMESTAMPTZ DEFAULT NOW(),
          assigned_by TEXT,
          expires_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT TRUE,
          CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
        );
      `
    });

    if (userRolesError) {
      console.error('Error creating user_roles table:', userRolesError);
    } else {
      console.log('✓ User_roles table created successfully');
    }

    // Create role_permissions table
    const { error: rolePermissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS role_permissions (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          role_id TEXT NOT NULL,
          permission_id TEXT NOT NULL,
          granted_at TIMESTAMPTZ DEFAULT NOW(),
          granted_by TEXT,
          CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
        );
      `
    });

    if (rolePermissionsError) {
      console.error('Error creating role_permissions table:', rolePermissionsError);
    } else {
      console.log('✓ Role_permissions table created successfully');
    }

    // Insert default roles
    console.log('Inserting default roles...');
    const { error: insertRolesError } = await supabase
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
          description: 'Gestión de inventario y reportes',
          is_system_role: true
        },
        {
          name: 'CASHIER',
          display_name: 'Cajero',
          description: 'Operaciones de venta básicas',
          is_system_role: true
        }
      ], { onConflict: 'name' });

    if (insertRolesError) {
      console.error('Error inserting default roles:', insertRolesError);
    } else {
      console.log('✓ Default roles inserted successfully');
    }

    // Insert default permissions
    console.log('Inserting default permissions...');
    const permissions = [
      // Dashboard permissions
      { name: 'dashboard:read', display_name: 'Ver Dashboard', description: 'Acceso al dashboard principal', resource: 'dashboard', action: 'read' },
      { name: 'dashboard:stats', display_name: 'Ver Estadísticas', description: 'Ver estadísticas del dashboard', resource: 'dashboard', action: 'stats' },
      
      // Product permissions
      { name: 'products:read', display_name: 'Ver Productos', description: 'Ver lista de productos', resource: 'products', action: 'read' },
      { name: 'products:create', display_name: 'Crear Productos', description: 'Crear nuevos productos', resource: 'products', action: 'create' },
      { name: 'products:update', display_name: 'Actualizar Productos', description: 'Modificar productos existentes', resource: 'products', action: 'update' },
      { name: 'products:delete', display_name: 'Eliminar Productos', description: 'Eliminar productos', resource: 'products', action: 'delete' },
      
      // Sales permissions
      { name: 'sales:read', display_name: 'Ver Ventas', description: 'Ver historial de ventas', resource: 'sales', action: 'read' },
      { name: 'sales:create', display_name: 'Crear Ventas', description: 'Procesar nuevas ventas', resource: 'sales', action: 'create' },
      { name: 'sales:update', display_name: 'Actualizar Ventas', description: 'Modificar ventas existentes', resource: 'sales', action: 'update' },
      { name: 'sales:delete', display_name: 'Eliminar Ventas', description: 'Eliminar ventas', resource: 'sales', action: 'delete' },
      
      // Category permissions
      { name: 'categories:read', display_name: 'Ver Categorías', description: 'Ver categorías de productos', resource: 'categories', action: 'read' },
      { name: 'categories:create', display_name: 'Crear Categorías', description: 'Crear nuevas categorías', resource: 'categories', action: 'create' },
      { name: 'categories:update', display_name: 'Actualizar Categorías', description: 'Modificar categorías', resource: 'categories', action: 'update' },
      { name: 'categories:delete', display_name: 'Eliminar Categorías', description: 'Eliminar categorías', resource: 'categories', action: 'delete' },
      
      // User permissions
      { name: 'users:read', display_name: 'Ver Usuarios', description: 'Ver lista de usuarios', resource: 'users', action: 'read' },
      { name: 'users:create', display_name: 'Crear Usuarios', description: 'Crear nuevos usuarios', resource: 'users', action: 'create' },
      { name: 'users:update', display_name: 'Actualizar Usuarios', description: 'Modificar usuarios', resource: 'users', action: 'update' },
      { name: 'users:delete', display_name: 'Eliminar Usuarios', description: 'Eliminar usuarios', resource: 'users', action: 'delete' }
    ];

    const { error: insertPermissionsError } = await supabase
      .from('permissions')
      .upsert(permissions, { onConflict: 'name' });

    if (insertPermissionsError) {
      console.error('Error inserting default permissions:', insertPermissionsError);
    } else {
      console.log('✓ Default permissions inserted successfully');
    }

    // Assign all permissions to ADMIN role
    console.log('Assigning permissions to ADMIN role...');
    
    // Get ADMIN role ID
    const { data: adminRole, error: adminRoleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'ADMIN')
      .single();

    if (adminRoleError || !adminRole) {
      console.error('Error getting ADMIN role:', adminRoleError);
      return;
    }

    // Get all permissions
    const { data: allPermissions, error: permissionsSelectError } = await supabase
      .from('permissions')
      .select('id');

    if (permissionsSelectError || !allPermissions) {
      console.error('Error getting permissions:', permissionsSelectError);
      return;
    }

    // Create role-permission assignments
    const rolePermissions = allPermissions.map(permission => ({
      role_id: adminRole.id,
      permission_id: permission.id
    }));

    const { error: assignPermissionsError } = await supabase
      .from('role_permissions')
      .upsert(rolePermissions, { onConflict: 'role_id,permission_id' });

    if (assignPermissionsError) {
      console.error('Error assigning permissions to ADMIN:', assignPermissionsError);
    } else {
      console.log('✓ All permissions assigned to ADMIN role');
    }

    // Assign ADMIN role to admin@test.com user
    console.log('Assigning ADMIN role to admin@test.com...');
    
    // Get admin user from auth.users
    const { data: adminUser, error: adminUserError } = await supabase.auth.admin.listUsers();
    
    if (adminUserError) {
      console.error('Error getting admin user:', adminUserError);
      return;
    }

    const adminUserRecord = adminUser.users.find(user => user.email === 'admin@test.com');
    
    if (!adminUserRecord) {
      console.error('Admin user not found');
      return;
    }

    // Assign ADMIN role to user
    const { error: assignRoleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: adminUserRecord.id,
        role_id: adminRole.id
      }, { onConflict: 'user_id,role_id' });

    if (assignRoleError) {
      console.error('Error assigning ADMIN role to user:', assignRoleError);
    } else {
      console.log('✓ ADMIN role assigned to admin@test.com');
    }

    console.log('\n🎉 Roles and permissions system setup completed successfully!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createRolesTables();