const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function grantTablePermissions() {
  console.log('🔧 Otorgando permisos directos a tablas de roles...');

  try {
    // Grant SELECT permissions to authenticated role
    const grantQueries = [
      'GRANT SELECT ON user_roles TO authenticated;',
      'GRANT SELECT ON roles TO authenticated;',
      'GRANT SELECT ON permissions TO authenticated;',
      'GRANT SELECT ON role_permissions TO authenticated;',
      'GRANT USAGE ON SCHEMA public TO authenticated;'
    ];

    for (const sql of grantQueries) {
      console.log('🔑 Otorgando permisos:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error otorgando permisos:', error);
      } else {
        console.log('✅ Permisos otorgados exitosamente');
      }
    }

    // Also grant to anon role for testing
    const grantAnonQueries = [
      'GRANT SELECT ON user_roles TO anon;',
      'GRANT SELECT ON roles TO anon;',
      'GRANT SELECT ON permissions TO anon;',
      'GRANT SELECT ON role_permissions TO anon;'
    ];

    for (const sql of grantAnonQueries) {
      console.log('🔑 Otorgando permisos a anon:', sql);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('❌ Error otorgando permisos a anon:', error);
      } else {
        console.log('✅ Permisos a anon otorgados exitosamente');
      }
    }

    // Test access after granting permissions
    console.log('🧪 Probando acceso después de otorgar permisos...');
    
    const { data: testRoles, error: testError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error probando acceso:', testError);
    } else {
      console.log('✅ Acceso a tablas funcionando correctamente');
      console.log('📊 Datos de prueba:', testRoles);
    }

    // Test with authenticated client
    console.log('🧪 Probando con cliente autenticado...');
    
    // Create a client with anon key to simulate authenticated user
    const anonClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: anonTestRoles, error: anonTestError } = await anonClient
      .from('user_roles')
      .select('*')
      .limit(1);

    if (anonTestError) {
      console.error('❌ Error con cliente anon:', anonTestError);
    } else {
      console.log('✅ Cliente anon funcionando correctamente');
      console.log('📊 Datos con anon:', anonTestRoles);
    }

    console.log('🎉 Permisos otorgados exitosamente');

  } catch (error) {
    console.error('❌ Error otorgando permisos:', error);
  }
}

grantTablePermissions();