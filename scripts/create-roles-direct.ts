import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRolesAndPermissions() {
  console.log('🔧 Creating roles and permissions tables...\n');

  try {
    // Create roles table
    console.log('1. Creating roles table...');
    const { error: rolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
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

    if (rolesError) {
      console.log('❌ Error creating roles table:', rolesError);
    } else {
      console.log('✅ Roles table created successfully');
    }

    // Create permissions table
    console.log('2. Creating permissions table...');
    const { error: permissionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
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

    if (permissionsError) {
      console.log('❌ Error creating permissions table:', permissionsError);
    } else {
      console.log('✅ Permissions table created successfully');
    }

    // Create user_roles table
    console.log('3. Creating user_roles table...');
    const { error: userRolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_roles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          role_id INTEGER NOT NULL,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          assigned_by VARCHAR(255),
          expires_at TIMESTAMP WITH TIME ZONE,
          is_active BOOLEAN DEFAULT true,
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          UNIQUE(user_id, role_id)
        );
      `
    });

    if (userRolesError) {
      console.log('❌ Error creating user_roles table:', userRolesError);
    } else {
      console.log('✅ User_roles table created successfully');
    }

    // Insert default roles
    console.log('4. Inserting default roles...');
    const roles = [
      { name: 'ADMIN', display_name: 'Administrador', description: 'Acceso completo al sistema', is_system_role: true },
      { name: 'MANAGER', display_name: 'Gerente', description: 'Gestión de inventario y reportes', is_system_role: true },
      { name: 'CASHIER', display_name: 'Cajero', description: 'Operaciones de venta básicas', is_system_role: true },
      { name: 'EMPLOYEE', display_name: 'Empleado', description: 'Acceso limitado al sistema', is_system_role: true }
    ];

    for (const role of roles) {
      const { error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' });
      
      if (error) {
        console.log(`❌ Error inserting role ${role.name}:`, error);
      } else {
        console.log(`✅ Role ${role.name} inserted successfully`);
      }
    }

    // Insert default permissions
    console.log('5. Inserting default permissions...');
    const permissions = [
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
      
      // Category permissions
      { name: 'categories.read', resource: 'categories', action: 'read', description: 'Ver categorías' },
      { name: 'categories.create', resource: 'categories', action: 'create', description: 'Crear categorías' },
      { name: 'categories.update', resource: 'categories', action: 'update', description: 'Actualizar categorías' },
      { name: 'categories.delete', resource: 'categories', action: 'delete', description: 'Eliminar categorías' },
      
      // Sale permissions
      { name: 'sales.read', resource: 'sales', action: 'read', description: 'Ver ventas' },
      { name: 'sales.create', resource: 'sales', action: 'create', description: 'Crear ventas' },
      { name: 'sales.update', resource: 'sales', action: 'update', description: 'Actualizar ventas' },
      { name: 'sales.delete', resource: 'sales', action: 'delete', description: 'Eliminar ventas' },
      
      // Customer permissions
      { name: 'customers.read', resource: 'customers', action: 'read', description: 'Ver clientes' },
      { name: 'customers.create', resource: 'customers', action: 'create', description: 'Crear clientes' },
      { name: 'customers.update', resource: 'customers', action: 'update', description: 'Actualizar clientes' },
      { name: 'customers.delete', resource: 'customers', action: 'delete', description: 'Eliminar clientes' },
      
      // Purchase permissions
      { name: 'purchases.read', resource: 'purchases', action: 'read', description: 'Ver compras' },
      { name: 'purchases.create', resource: 'purchases', action: 'create', description: 'Crear compras' },
      { name: 'purchases.update', resource: 'purchases', action: 'update', description: 'Actualizar compras' },
      { name: 'purchases.delete', resource: 'purchases', action: 'delete', description: 'Eliminar compras' },
      
      // Supplier permissions
      { name: 'suppliers.read', resource: 'suppliers', action: 'read', description: 'Ver proveedores' },
      { name: 'suppliers.create', resource: 'suppliers', action: 'create', description: 'Crear proveedores' },
      { name: 'suppliers.update', resource: 'suppliers', action: 'update', description: 'Actualizar proveedores' },
      { name: 'suppliers.delete', resource: 'suppliers', action: 'delete', description: 'Eliminar proveedores' },
      
      // Report permissions
      { name: 'reports.view', resource: 'reports', action: 'view', description: 'Ver reportes' },
      { name: 'reports.export', resource: 'reports', action: 'export', description: 'Exportar reportes' },
      
      // System permissions
      { name: 'system.settings', resource: 'system', action: 'settings', description: 'Configuración del sistema' },
      { name: 'system.backup', resource: 'system', action: 'backup', description: 'Respaldo del sistema' }
    ];

    for (const permission of permissions) {
      const { error } = await supabase
        .from('permissions')
        .upsert(permission, { onConflict: 'name' });
      
      if (error) {
        console.log(`❌ Error inserting permission ${permission.name}:`, error);
      } else {
        console.log(`✅ Permission ${permission.name} inserted successfully`);
      }
    }

    // Assign permissions to roles
    console.log('6. Assigning permissions to roles...');
    
    // Get all roles and permissions
    const { data: rolesData } = await supabase.from('roles').select('*');
    const { data: permissionsData } = await supabase.from('permissions').select('*');

    if (rolesData && permissionsData) {
      // ADMIN gets all permissions
      const adminRole = rolesData.find(r => r.name === 'ADMIN');
      if (adminRole) {
        for (const permission of permissionsData) {
          const { error } = await supabase
            .from('role_permissions')
            .upsert({
              role_id: adminRole.id,
              permission_id: permission.id,
              is_active: true
            }, { onConflict: 'role_id,permission_id' });
          
          if (error) {
            console.log(`❌ Error assigning permission ${permission.name} to ADMIN:`, error);
          }
        }
        console.log('✅ All permissions assigned to ADMIN');
      }

      // CASHIER gets basic permissions
      const cashierRole = rolesData.find(r => r.name === 'CASHIER');
      if (cashierRole) {
        const cashierPermissions = permissionsData.filter(p => 
          ['sales.read', 'sales.create', 'customers.read', 'customers.create', 'products.read', 'categories.read'].includes(p.name)
        );
        
        for (const permission of cashierPermissions) {
          const { error } = await supabase
            .from('role_permissions')
            .upsert({
              role_id: cashierRole.id,
              permission_id: permission.id,
              is_active: true
            }, { onConflict: 'role_id,permission_id' });
          
          if (error) {
            console.log(`❌ Error assigning permission ${permission.name} to CASHIER:`, error);
          }
        }
        console.log('✅ Basic permissions assigned to CASHIER');
      }
    }

    // Assign roles to existing users
    console.log('7. Assigning roles to existing users...');
    const { data: users } = await supabase.from('users').select('*');
    
    if (users && rolesData) {
      for (const user of users) {
        const userRole = rolesData.find(r => r.name === user.role);
        if (userRole) {
          const { error } = await supabase
            .from('user_roles')
            .upsert({
              user_id: user.id,
              role_id: userRole.id,
              assigned_at: new Date().toISOString(),
              is_active: true
            }, { onConflict: 'user_id,role_id' });
          
          if (error) {
            console.log(`❌ Error assigning role ${userRole.name} to user ${user.email}:`, error);
          } else {
            console.log(`✅ Role ${userRole.name} assigned to user ${user.email}`);
          }
        }
      }
    }

    console.log('\n🎉 Roles and permissions setup completed successfully!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

createRolesAndPermissions();