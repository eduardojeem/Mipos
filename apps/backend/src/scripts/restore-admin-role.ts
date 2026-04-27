/**
 * Script para restaurar rol de ADMIN a bfjeem@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/"/g, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/"/g, '');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreAdmin() {
  console.log('🔄 Restaurando rol de ADMIN a bfjeem@gmail.com...\n');
  
  const { error } = await supabase
    .from('users')
    .update({ role: 'ADMIN' })
    .eq('email', 'bfjeem@gmail.com');
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Rol de ADMIN restaurado exitosamente');
  console.log('   Recarga la página para ver los cambios\n');
}

restoreAdmin();
