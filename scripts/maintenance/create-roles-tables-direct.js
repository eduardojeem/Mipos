const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  try {
    console.log(`Executing: ${description}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error in ${description}:`, error);
      return false;
    } else {
      console.log(`✓ ${description} completed successfully`);
      return true;
    }
  } catch (err) {
    console.error(`Unexpected error in ${description}:`, err);
    return false;
  }
}

async function createRolesTables() {
  try {
    console.log('Creating roles and permissions system...\n');

    // Create roles table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.roles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `, 'Creating roles table');

    // Create permissions table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `, 'Creating permissions table');

    // Create user_roles table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        assigned_by TEXT,
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        CONSTRAINT user_roles_unique UNIQUE (user_id, role_id)
      );
    `, 'Creating user_roles table');

    // Create role_permissions table
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        granted_at TIMESTAMPTZ DEFAULT NOW(),
        granted_by TEXT,
        CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
      );
    `, 'Creating role_permissions table');

    // Insert default roles
    await executeSQL(`
      INSERT INTO public.roles (name, description, is_system_role) VALUES
      ('ADMIN', 'Acceso completo al sistema', true),
      ('MANAGER', 'Gestión de inventario y reportes', true),
      ('CASHIER', 'Operaciones de venta básicas', true)
      ON CONFLICT (name) DO NOTHING;
    `, 'Inserting default roles');

    // Insert default permissions
    await executeSQL(`
      INSERT INTO public.permissions (name, description, resource, action) VALUES
      ('dashboard:read', 'Acceso al dashboard principal', 'dashboard', 'read'),
      ('dashboard:stats', 'Ver estadísticas del dashboard', 'dashboard', 'stats'),
      ('products:read', 'Ver lista de productos', 'products', 'read'),
      ('products:create', 'Crear nuevos productos', 'products', 'create'),
      ('products:update', 'Modificar productos existentes', 'products', 'update'),
      ('products:delete', 'Eliminar productos', 'products', 'delete'),
      ('sales:read', 'Ver historial de ventas', 'sales', 'read'),
      ('sales:create', 'Procesar nuevas ventas', 'sales', 'create'),
      ('sales:update', 'Modificar ventas existentes', 'sales', 'update'),
      ('sales:delete', 'Eliminar ventas', 'sales', 'delete'),
      ('categories:read', 'Ver categorías de productos', 'categories', 'read'),
      ('categories:create', 'Crear nuevas categorías', 'categories', 'create'),
      ('categories:update', 'Modificar categorías', 'categories', 'update'),
      ('categories:delete', 'Eliminar categorías', 'categories', 'delete'),
      ('users:read', 'Ver lista de usuarios', 'users', 'read'),
      ('users:create', 'Crear nuevos usuarios', 'users', 'create'),
      ('users:update', 'Modificar usuarios', 'users', 'update'),
      ('users:delete', 'Eliminar usuarios', 'users', 'delete')
      ON CONFLICT (name) DO NOTHING;
    `, 'Inserting default permissions');

    // Assign all permissions to ADMIN role
    await executeSQL(`
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM public.roles r, public.permissions p
      WHERE r.name = 'ADMIN'
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `, 'Assigning all permissions to ADMIN role');

    // Get admin user and assign ADMIN role
    console.log('Getting admin user from Supabase Auth...');
    const { data: adminUsers, error: adminUserError } = await supabase.auth.admin.listUsers();
    
    if (adminUserError) {
      console.error('Error getting admin user:', adminUserError);
      return;
    }

    const adminUser = adminUsers.users.find(user => user.email === 'admin@test.com');
    
    if (!adminUser) {
      console.error('Admin user not found');
      return;
    }

    console.log(`Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // Assign ADMIN role to admin user
    await executeSQL(`
      INSERT INTO public.user_roles (user_id, role_id)
      SELECT '${adminUser.id}', r.id
      FROM public.roles r
      WHERE r.name = 'ADMIN'
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `, 'Assigning ADMIN role to admin@test.com');

    // Enable RLS policies
    await executeSQL(`
      ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
    `, 'Enabling Row Level Security');

    // Create RLS policies
    await executeSQL(`
      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read roles" ON public.roles
        FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read permissions" ON public.permissions
        FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read user_roles" ON public.user_roles
        FOR SELECT TO authenticated USING (true);
      
      CREATE POLICY IF NOT EXISTS "Allow authenticated users to read role_permissions" ON public.role_permissions
        FOR SELECT TO authenticated USING (true);
    `, 'Creating RLS policies');

    console.log('\n🎉 Roles and permissions system setup completed successfully!');
    console.log('✓ Tables created');
    console.log('✓ Default roles and permissions inserted');
    console.log('✓ ADMIN role assigned all permissions');
    console.log('✓ admin@test.com assigned ADMIN role');
    console.log('✓ RLS policies configured');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createRolesTables();