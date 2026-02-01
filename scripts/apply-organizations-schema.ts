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
  console.log('🚀 Applying organizations schema...');
  
  const sqlPath = path.join(process.cwd(), 'scripts', 'create-organizations-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // We can't execute multiple statements in one RPC call usually if using `exec_sql` helper unless it supports it.
  // But `exec_sql` (if it exists) usually takes a single string.
  // Alternatively, we can split by ';' but that's fragile.
  // Let's assume `exec_sql` can handle the block or we use `pg` driver if needed.
  // Since `create-tables-direct.ts` uses `exec_sql` via RPC or direct SQL if possible.
  // I'll try to use the same approach as `create-tables-direct.ts`.
  
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error executing SQL via RPC:', error);
    console.log('Trying to split statements...');
    
    // Split by statement and try one by one (primitive splitting)
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (stmtError) {
            console.error('Failed statement:', stmt.substring(0, 50) + '...');
            console.error(stmtError);
        } else {
            console.log('Statement executed.');
        }
    }
  } else {
    console.log('✅ SQL executed successfully via RPC.');
  }
}

main();
