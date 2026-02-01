import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Applying grants...');
  
  const sqlPath = path.join(process.cwd(), 'scripts', 'grant-permissions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split by statement because RLS policies need individual execution usually in some tools, 
  // but let's try RPC exec_sql first.
  
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error executing SQL via RPC:', error);
    // Retry splitting
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        // Simple skip if empty
        if (!stmt) continue;
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (stmtError) {
             // Ignore "policy already exists" errors
             if (stmtError.message.includes('already exists')) {
                 console.log('Policy already exists, skipping.');
             } else {
                 console.error('Failed statement:', stmt.substring(0, 50) + '...');
                 console.error(stmtError);
             }
        } else {
            console.log('Statement executed.');
        }
    }
  } else {
    console.log('✅ SQL executed successfully via RPC.');
  }
}

main();
