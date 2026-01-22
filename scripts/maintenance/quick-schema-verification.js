const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function quickSchemaCheck() {
  console.log('🔍 Quick Schema Verification...\n');

  try {
    // Test básico de estructura de users
    console.log('👤 Checking users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role')
      .limit(1);

    if (userError) {
      console.log('❌ Users table issues:', userError.message);
      if (userError.code === 'PGRST204') {
        console.log('   → Schema cache needs refresh or columns missing');
      }
    } else {
      console.log('✅ Users table accessible');
      console.log('   → Sample data:', userData?.[0] ? 'Found' : 'Empty');
    }

    // Test básico de estructura de customers
    console.log('\n👥 Checking customers table...');
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone, email, customer_type, is_active')
      .limit(1);

    if (customerError) {
      console.log('❌ Customers table issues:', customerError.message);
      if (customerError.code === 'PGRST204') {
        console.log('   → Schema cache needs refresh or columns missing');
      }
    } else {
      console.log('✅ Customers table accessible');
      console.log('   → Sample data:', customerData?.[0] ? 'Found' : 'Empty');
    }

    // Conteo rápido de registros
    console.log('\n📊 Record counts:');
    
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    console.log(`   → Users: ${usersCount || 0} records`);
    console.log(`   → Customers: ${customersCount || 0} records`);

    // Test de inserción simple para verificar esquema
    console.log('\n🧪 Testing basic operations...');
    
    const testCustomer = {
      name: `Test Customer ${Date.now()}`,
      phone: '+1234567890',
      email: `test${Date.now()}@example.com`
    };

    const { data: insertData, error: insertError } = await supabase
      .from('customers')
      .insert(testCustomer)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      if (insertError.code === 'PGRST204') {
        console.log('   → Schema fix still needed');
      }
    } else {
      console.log('✅ Insert test successful');
      // Limpiar el registro de prueba
      await supabase.from('customers').delete().eq('id', insertData.id);
      console.log('   → Test record cleaned up');
    }

    console.log('\n🎯 Status Summary:');
    const hasUserIssues = !!userError;
    const hasCustomerIssues = !!customerError;
    const hasInsertIssues = !!insertError;

    if (!hasUserIssues && !hasCustomerIssues && !hasInsertIssues) {
      console.log('🎉 All systems operational! Schema fix appears successful.');
    } else {
      console.log('⚠️  Issues detected:');
      if (hasUserIssues) console.log('   - Users table needs attention');
      if (hasCustomerIssues) console.log('   - Customers table needs attention');
      if (hasInsertIssues) console.log('   - Insert operations failing');
      console.log('\n💡 Next steps:');
      console.log('   1. Apply fix-schema-issues.sql in Supabase SQL Editor');
      console.log('   2. Wait for schema cache refresh');
      console.log('   3. Run this script again to verify');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

// Ejecutar verificación
quickSchemaCheck().catch(console.error);