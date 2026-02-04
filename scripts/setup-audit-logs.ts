import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAuditLogs() {
  console.log('🔧 Setting up audit_logs table...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-audit-logs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error executing SQL:', error);
      
      // Try alternative method - split and execute statements
      console.log('🔄 Trying alternative method...');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (stmtError) {
          console.error(`❌ Error executing statement: ${statement.substring(0, 50)}...`);
          console.error(stmtError);
        } else {
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        }
      }
    } else {
      console.log('✅ audit_logs table created successfully');
    }

    // Verify the table exists
    const { data, error: verifyError } = await supabase
      .from('audit_logs')
      .select('count')
      .limit(1);

    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError);
    } else {
      console.log('✅ Table verified successfully');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

setupAuditLogs();
