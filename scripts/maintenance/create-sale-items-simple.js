const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function createSaleItemsTable() {
  try {
    // Read environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
      process.exit(1);
    }

    console.log('🔗 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read the SQL script
    const sqlScript = fs.readFileSync('create-sale-items-table.sql', 'utf8');
    console.log('📄 SQL script loaded');

    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        // Continue with other statements
      }
    }

    console.log('🎉 Script execution completed!');

    // Verify the table was created
    console.log('🔍 Verifying table creation...');
    const { data: tableCheck, error: checkError } = await supabase
      .from('sale_items')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Table verification failed:', checkError);
    } else {
      console.log('✅ sale_items table is accessible!');
    }

  } catch (err) {
    console.error('❌ Script error:', err.message);
    process.exit(1);
  }
}

createSaleItemsTable();