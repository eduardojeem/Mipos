const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function refreshSchemaCache() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      process.exit(1);
    }

    console.log('🔗 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to refresh the schema cache by making a simple query
    console.log('🔄 Attempting to refresh schema cache...');
    
    // First, let's check if the table exists in the database
    console.log('🔍 Checking if sale_items table exists...');
    const { data: tableExists, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sale_items'
        );
      `
    });

    if (tableError) {
      console.error('❌ Error checking table existence:', tableError);
    } else {
      console.log('✅ Table existence check result:', tableExists);
    }

    // Try to force a schema refresh by making a direct query
    console.log('🔄 Forcing schema refresh...');
    const { data: refreshData, error: refreshError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 FROM public.sale_items LIMIT 0;'
    });

    if (refreshError) {
      console.error('❌ Error during schema refresh:', refreshError);
    } else {
      console.log('✅ Schema refresh successful');
    }

    // Wait a moment for the cache to update
    console.log('⏳ Waiting for cache to update...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Now try to access the table through the ORM
    console.log('🧪 Testing table access through Supabase client...');
    const { data: testData, error: testError } = await supabase
      .from('sale_items')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Table still not accessible:', testError);
      
      // Try alternative approach - restart the PostgREST service
      console.log('🔄 Attempting to restart PostgREST...');
      const { data: restartData, error: restartError } = await supabase.rpc('exec_sql', {
        sql: 'NOTIFY pgrst, \'reload schema\';'
      });

      if (restartError) {
        console.error('❌ Error restarting PostgREST:', restartError);
      } else {
        console.log('✅ PostgREST restart signal sent');
      }

      // Wait again
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Final test
      const { data: finalTest, error: finalError } = await supabase
        .from('sale_items')
        .select('*')
        .limit(1);

      if (finalError) {
        console.error('❌ Final test failed:', finalError);
        console.log('ℹ️ The table exists but may need manual schema refresh in Supabase dashboard');
      } else {
        console.log('✅ Final test successful! Table is now accessible');
      }

    } else {
      console.log('✅ Table is accessible! Schema cache updated successfully');
    }

    console.log('🎉 Schema refresh process completed');

  } catch (err) {
    console.error('❌ Script error:', err.message);
    process.exit(1);
  }
}

refreshSchemaCache();