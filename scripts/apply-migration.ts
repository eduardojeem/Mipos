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
  const fileArg = process.argv[2];
  if (!fileArg) {
      console.error('Usage: tsx scripts/apply-migration.ts <path-to-sql-file>');
      process.exit(1);
  }

  console.log(`🚀 Applying migration: ${fileArg}...`);
  
  const sqlPath = path.resolve(fileArg);
  if (!fs.existsSync(sqlPath)) {
      console.error('File not found:', sqlPath);
      process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error executing SQL via RPC:', error);
    // Retry splitting
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
        if (!stmt) continue;
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt });
        if (stmtError) {
             if (stmtError.message.includes('already exists')) {
                 console.log('Object already exists, skipping.');
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
