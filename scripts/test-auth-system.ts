import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAuthSystem() {
  console.log('🔐 Testing Authentication and Role System...\n');
  
  try {
    // 1. Test table access
    console.log('1️⃣ Testing table access...');
    
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(5);
    
    if (rolesError) {
      console.log('❌ Error accessing roles table:', rolesError);
    } else {
      console.log('✅ Roles table accessible:', rolesData?.length || 0, 'roles found');
      if (rolesData && rolesData.length > 0) {
        console.log('   Sample roles:', rolesData.map(r => r.name).join(', '));
      }
    }
    
    const { data: permissionsData, error: permissionsError } = await supabase
      .from('permissions')
      .select('*')
      .limit(5);
    
    if (permissionsError) {
      console.log('❌ Error accessing permissions table:', permissionsError);
    } else {
      console.log('✅ Permissions table accessible:', permissionsData?.length || 0, 'permissions found');
      if (permissionsData && permissionsData.length > 0) {
        console.log('   Sample permissions:', permissionsData.map(p => p.name).join(', '));
      }
    }
    
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5);
    
    if (userRolesError) {
      console.log('❌ Error accessing user_roles table:', userRolesError);
    } else {
      console.log('✅ User_roles table accessible:', userRolesData?.length || 0, 'assignments found');
    }
    
    const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
      .from('role_permissions')
      .select('*')
      .limit(5);
    
    if (rolePermissionsError) {
      console.log('❌ Error accessing role_permissions table:', rolePermissionsError);
    } else {
      console.log('✅ Role_permissions table accessible:', rolePermissionsData?.length || 0, 'mappings found');
    }
    
    // 2. Test users table
    console.log('\n2️⃣ Testing users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error accessing users table:', usersError);
    } else {
      console.log('✅ Users table accessible:', usersData?.length || 0, 'users found');
      if (usersData && usersData.length > 0) {
        console.log('   Sample users:');
        usersData.forEach(user => {
          console.log(`   - ${user.email} (role: ${user.role})`);
        });
      }
    }
    
    // 3. Test role relationships
    console.log('\n3️⃣ Testing role relationships...');
    const { data: roleRelations, error: roleRelationsError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles (
          name,
          display_name
        )
      `)
      .limit(5);
    
    if (roleRelationsError) {
      console.log('❌ Error testing role relationships:', roleRelationsError);
    } else {
      console.log('✅ Role relationships working:', roleRelations?.length || 0, 'relationships found');
      if (roleRelations && roleRelations.length > 0) {
        roleRelations.forEach(rel => {
          console.log(`   - User ${rel.user_id} has role: ${rel.roles?.name}`);
        });
      }
    }
    
    // 4. Test permission relationships
    console.log('\n4️⃣ Testing permission relationships...');
    const { data: permissionRelations, error: permissionRelationsError } = await supabase
      .from('role_permissions')
      .select(`
        roles (
          name
        ),
        permissions (
          name,
          resource,
          action
        )
      `)
      .limit(5);
    
    if (permissionRelationsError) {
      console.log('❌ Error testing permission relationships:', permissionRelationsError);
    } else {
      console.log('✅ Permission relationships working:', permissionRelations?.length || 0, 'relationships found');
      if (permissionRelations && permissionRelations.length > 0) {
        permissionRelations.forEach(rel => {
          console.log(`   - Role ${rel.roles?.name} has permission: ${rel.permissions?.name}`);
        });
      }
    }
    
    // 5. Test RLS policies
    console.log('\n5️⃣ Testing RLS policies status...');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('roles', 'permissions', 'user_roles', 'role_permissions');
      `
    });
    
    if (rlsError) {
      console.log('❌ Error checking RLS status:', rlsError);
    } else {
      console.log('✅ RLS Status:');
      rlsStatus?.forEach(table => {
        console.log(`   - ${table.tablename}: ${table.rowsecurity ? '🔒 ENABLED' : '🔓 DISABLED'}`);
      });
    }
    
    // 6. Summary
    console.log('\n📊 SUMMARY:');
    const hasRoles = rolesData && rolesData.length > 0;
    const hasPermissions = permissionsData && permissionsData.length > 0;
    const hasUsers = usersData && usersData.length > 0;
    const hasRoleRelations = roleRelations && roleRelations.length > 0;
    const hasPermissionRelations = permissionRelations && permissionRelations.length > 0;
    
    if (hasRoles && hasPermissions && hasUsers) {
      console.log('✅ Basic tables are working correctly');
    } else {
      console.log('⚠️  Some basic tables may need data or have issues');
    }
    
    if (hasRoleRelations && hasPermissionRelations) {
      console.log('✅ Role system relationships are working');
    } else {
      console.log('⚠️  Role system relationships may need setup');
    }
    
    console.log('\n🎯 Next steps:');
    if (!hasRoles || !hasPermissions) {
      console.log('   - Run role and permission setup scripts');
    }
    if (!hasRoleRelations) {
      console.log('   - Assign roles to users');
    }
    if (!hasPermissionRelations) {
      console.log('   - Assign permissions to roles');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAuthSystem().catch(console.error);