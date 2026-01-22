import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupPermissions() {
  console.log('🚀 Setting up permissions system...');
  
  // First, let's check what tables exist
  console.log('\n📋 Checking existing tables...');
  
  const tables = ['roles', 'permissions', 'user_roles', 'role_permissions'];
  const tableStatus = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        tableStatus[table] = `❌ ${error.message}`;
      } else {
        tableStatus[table] = `✅ Accessible (${data?.length || 0} records)`;
      }
    } catch (err) {
      tableStatus[table] = `❌ ${err.message}`;
    }
  }
  
  console.log('Table Status:');
  Object.entries(tableStatus).forEach(([table, status]) => {
    console.log(`  ${table}: ${status}`);
  });
  
  // Try to insert default data to test if tables work
  console.log('\n🧪 Testing table operations...');
  
  // Test roles table
  try {
    const { data, error } = await supabase
      .from('roles')
      .upsert([
        { name: 'ADMIN', description: 'Administrator with full system access' },
        { name: 'MANAGER', description: 'Manager with elevated permissions' },
        { name: 'EMPLOYEE', description: 'Regular employee with basic permissions' }
      ], { 
        onConflict: 'name',
        ignoreDuplicates: true 
      });
    
    if (error) {
      console.log('❌ Roles upsert failed:', error.message);
    } else {
      console.log('✅ Roles upsert successful');
    }
  } catch (err) {
    console.log('❌ Roles operation error:', err.message);
  }
  
  // Test permissions table
  try {
    const { data, error } = await supabase
      .from('permissions')
      .upsert([
        { name: 'View Users', description: 'Can view user information', resource: 'users', action: 'read' },
        { name: 'Manage Users', description: 'Can create, update, and delete users', resource: 'users', action: 'write' },
        { name: 'View Products', description: 'Can view product information', resource: 'products', action: 'read' },
        { name: 'Manage Products', description: 'Can create, update, and delete products', resource: 'products', action: 'write' }
      ], { 
        onConflict: 'name',
        ignoreDuplicates: true 
      });
    
    if (error) {
      console.log('❌ Permissions upsert failed:', error.message);
    } else {
      console.log('✅ Permissions upsert successful');
    }
  } catch (err) {
    console.log('❌ Permissions operation error:', err.message);
  }
  
  // Final status check
  console.log('\n📊 Final status check...');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} records found`);
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0], null, 2)}`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('1. If tables show "permission denied", you need to create them manually in Supabase SQL Editor');
  console.log('2. If tables don\'t exist, use the create-tables-manually.sql file in Supabase SQL Editor');
  console.log('3. Ensure RLS policies allow service_role access to all tables');
  console.log('4. Check that the service role key has proper permissions');
}

setupPermissions().catch(console.error);