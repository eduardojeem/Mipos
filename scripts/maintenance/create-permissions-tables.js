import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function createPermissionsTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  console.log('🔧 Creating permissions tables and policies...');
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // First, let's try to insert some test data to see if tables exist
    console.log('\n📋 Testing if roles table exists by inserting default roles...');
    
    const defaultRoles = [
      { name: 'ADMIN', description: 'Administrator with full system access', is_system_role: true },
      { name: 'MANAGER', description: 'Manager with limited administrative access', is_system_role: false },
      { name: 'CASHIER', description: 'Cashier with sales access', is_system_role: false },
      { name: 'EMPLOYEE', description: 'Basic employee access', is_system_role: false }
    ];

    for (const role of defaultRoles) {
      const { data, error } = await supabase
        .from('roles')
        .upsert(role, { onConflict: 'name' })
        .select();

      if (error) {
        console.log(`⚠️ Could not insert role ${role.name}:`, error.message);
        if (error.message.includes('does not exist')) {
          console.log('❌ Roles table does not exist. Need to create it manually in Supabase.');
          break;
        }
      } else {
        console.log(`✅ Role ${role.name} created/updated successfully`);
      }
    }

    // Test permissions table
    console.log('\n📋 Testing if permissions table exists by inserting default permissions...');
    
    const defaultPermissions = [
      { name: 'View Users', resource: 'users', action: 'read', description: 'Can view user information' },
      { name: 'Manage Users', resource: 'users', action: 'write', description: 'Can create and edit users' },
      { name: 'View Products', resource: 'products', action: 'read', description: 'Can view product information' },
      { name: 'Manage Products', resource: 'products', action: 'write', description: 'Can create and edit products' },
      { name: 'View Sales', resource: 'sales', action: 'read', description: 'Can view sales information' },
      { name: 'Manage Sales', resource: 'sales', action: 'write', description: 'Can create and edit sales' }
    ];

    for (const permission of defaultPermissions) {
      const { data, error } = await supabase
        .from('permissions')
        .upsert(permission, { onConflict: 'resource,action' })
        .select();

      if (error) {
        console.log(`⚠️ Could not insert permission ${permission.name}:`, error.message);
        if (error.message.includes('does not exist')) {
          console.log('❌ Permissions table does not exist. Need to create it manually in Supabase.');
          break;
        }
      } else {
        console.log(`✅ Permission ${permission.name} created/updated successfully`);
      }
    }

    // Test user_roles table by trying to query it
    console.log('\n📋 Testing user_roles table access...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (userRolesError) {
      console.log('❌ User_roles table error:', userRolesError.message);
      if (userRolesError.message.includes('does not exist')) {
        console.log('❌ User_roles table does not exist. Need to create it manually in Supabase.');
      }
    } else {
      console.log('✅ User_roles table accessible');
    }

    // Now test if we can query with the frontend client (anon key)
    console.log('\n🧪 Testing with frontend client (anon key)...');
    const frontendClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: frontendRoles, error: frontendError } = await frontendClient
      .from('roles')
      .select('*')
      .limit(1);

    if (frontendError) {
      console.log('❌ Frontend client cannot access roles:', frontendError.message);
    } else {
      console.log('✅ Frontend client can access roles:', frontendRoles?.length || 0, 'records');
    }

    console.log('\n🎉 Table creation/testing process completed!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. If tables don\'t exist, create them manually in Supabase SQL Editor');
    console.log('2. If tables exist but have permission issues, check RLS policies');
    console.log('3. Ensure service_role has proper grants on all tables');

  } catch (error) {
    console.error('❌ Error in table creation process:', error);
    process.exit(1);
  }
}

createPermissionsTables();