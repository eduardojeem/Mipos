import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumnTypes() {
  console.log('🔍 Checking column data types...');
  
  try {
    // Check user_roles table structure
    console.log('\n📋 Checking user_roles table structure...');
    const { data: userRolesData, error: userRolesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_roles')
      .order('ordinal_position');
    
    if (userRolesError) {
      console.log('❌ Error checking user_roles:', userRolesError);
      
      // Try alternative approach using RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'user_roles'
          ORDER BY ordinal_position;
        `
      });
      
      if (rpcError) {
        console.log('❌ RPC Error:', rpcError);
      } else {
        console.log('✅ user_roles table structure (via RPC):', JSON.stringify(rpcData, null, 2));
      }
    } else {
      console.log('✅ user_roles table structure:', JSON.stringify(userRolesData, null, 2));
    }
    
    // Check users table id type
    console.log('\n👤 Checking users table id column...');
    const { data: usersData, error: usersError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'users')
      .eq('column_name', 'id');
    
    if (usersError) {
      console.log('❌ Error checking users:', usersError);
      
      // Try alternative approach using RPC
      const { data: rpcUsersData, error: rpcUsersError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
          AND column_name = 'id';
        `
      });
      
      if (rpcUsersError) {
        console.log('❌ RPC Users Error:', rpcUsersError);
      } else {
        console.log('✅ users.id column type (via RPC):', JSON.stringify(rpcUsersData, null, 2));
      }
    } else {
      console.log('✅ users.id column type:', JSON.stringify(usersData, null, 2));
    }
    
    // Check auth.users table structure (Supabase auth table)
    console.log('\n🔐 Checking auth.users table id column...');
    const { data: authUsersData, error: authUsersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'auth' 
        AND table_name = 'users'
        AND column_name = 'id';
      `
    });
    
    if (authUsersError) {
      console.log('❌ Auth Users Error:', authUsersError);
    } else {
      console.log('✅ auth.users.id column type:', JSON.stringify(authUsersData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkColumnTypes().catch(console.error);