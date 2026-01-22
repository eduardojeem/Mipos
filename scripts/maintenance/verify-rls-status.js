const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRLSStatus() {
  console.log('🔍 Verificando estado de las políticas RLS...\n');

  try {
    // Test 1: Check if we can access users table
    console.log('1️⃣ Probando acceso a tabla users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.log('❌ Error accediendo a users:', usersError.message);
      console.log('   Código:', usersError.code);
    } else {
      console.log('✅ Acceso a users exitoso, registros encontrados:', users?.length || 0);
    }

    // Test 2: Check if we can access customers table
    console.log('\n2️⃣ Probando acceso a tabla customers...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name')
      .limit(1);

    if (customersError) {
      console.log('❌ Error accediendo a customers:', customersError.message);
      console.log('   Código:', customersError.code);
    } else {
      console.log('✅ Acceso a customers exitoso, registros encontrados:', customers?.length || 0);
    }

    // Test 3: Try to insert a test record to users (should work with service role)
    console.log('\n3️⃣ Probando inserción en tabla users...');
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password_hash: 'test-hash',
      role: 'user',
      created_at: new Date().toISOString()
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select();

    if (insertError) {
      console.log('❌ Error insertando en users:', insertError.message);
      console.log('   Código:', insertError.code);
    } else {
      console.log('✅ Inserción en users exitosa');
      
      // Clean up test record
      if (insertResult && insertResult[0]) {
        await supabase
          .from('users')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🧹 Registro de prueba eliminado');
      }
    }

    // Test 4: Check RLS status via SQL (if possible)
    console.log('\n4️⃣ Intentando verificar estado RLS via SQL...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_rls_status');

    if (rlsError) {
      console.log('❌ No se pudo verificar RLS via función:', rlsError.message);
    } else {
      console.log('✅ Estado RLS obtenido:', rlsStatus);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }

  console.log('\n📋 RESUMEN:');
  console.log('- Si ves errores 42501 (permission denied), las políticas RLS están bloqueando el acceso');
  console.log('- Si ves errores PGRST202/PGRST205, hay problemas con el esquema o funciones');
  console.log('- Si todo funciona, las políticas RLS están correctamente configuradas');
  
  console.log('\n🔧 SOLUCIÓN:');
  console.log('1. Ve al panel de Supabase: https://supabase.com/dashboard');
  console.log('2. Selecciona tu proyecto');
  console.log('3. Ve a SQL Editor');
  console.log('4. Ejecuta el contenido de: supabase-rls-fix.sql');
  console.log('5. O ejecuta: emergency-rls-disable.sql (para desarrollo)');
}

verifyRLSStatus().catch(console.error);