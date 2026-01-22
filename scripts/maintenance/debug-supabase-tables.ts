import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugSupabaseTables() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    console.log('🔍 Checking available tables in Supabase...');
    
    // Check users table
    console.log('\n📋 Testing users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible, sample:', users?.[0] || 'No data');
    }
    
    // Check UserRole_New table
    console.log('\n📋 Testing UserRole_New table:');
    const { data: userRoles1, error: userRolesError1 } = await supabase
      .from('UserRole_New')
      .select('*')
      .limit(1);
    
    if (userRolesError1) {
      console.log('❌ UserRole_New table error:', userRolesError1.message);
    } else {
      console.log('✅ UserRole_New table accessible, sample:', userRoles1?.[0] || 'No data');
    }
    
    // Try alternative table names
    const alternativeNames = ['user_roles', 'userrole_new', 'UserRoles', 'user_role_new'];
    
    for (const tableName of alternativeNames) {
      console.log(`\n📋 Testing ${tableName} table:`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${tableName} table error:`, error.message);
      } else {
        console.log(`✅ ${tableName} table accessible, sample:`, data?.[0] || 'No data');
      }
    }
    
    // Check roles table
    console.log('\n📋 Testing roles table:');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(1);
    
    if (rolesError) {
      console.log('❌ Roles table error:', rolesError.message);
    } else {
      console.log('✅ Roles table accessible, sample:', roles?.[0] || 'No data');
    }
    
    // Check permissions table
    console.log('\n📋 Testing permissions table:');
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(1);
    
    if (permissionsError) {
      console.log('❌ Permissions table error:', permissionsError.message);
    } else {
      console.log('✅ Permissions table accessible, sample:', permissions?.[0] || 'No data');
    }
    
    // Check RolePermission_New table
    console.log('\n📋 Testing RolePermission_New table:');
    const { data: rolePerms, error: rolePermsError } = await supabase
      .from('RolePermission_New')
      .select('*')
      .limit(1);
    
    if (rolePermsError) {
      console.log('❌ RolePermission_New table error:', rolePermsError.message);
    } else {
      console.log('✅ RolePermission_New table accessible, sample:', rolePerms?.[0] || 'No data');
    }
    
    // Test specific user query
    console.log('\n🔍 Testing specific user query:');
    const userId = '01041242-4be1-4fea-a91d-b0c8d6d2c320';
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.log('❌ User query error:', userError.message);
    } else {
      console.log('✅ User found:', userData);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

debugSupabaseTables();