import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCashFix() {
    console.log('🔧 Aplicando correcciones a tablas de CAJA...\n');

    const sqlFilePath = path.join(process.cwd(), 'supabase/migrations/20251129_fix_cash_tables.sql');

    try {
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        console.log('📄 Leído archivo SQL:', sqlFilePath);

        // Supabase JS client doesn't have a direct "exec sql" method for arbitrary SQL unless we use a specific RPC or the pg driver.
        // However, we can try to use the `rpc` method if we have an `exec_sql` function, OR we can use the `postgres` library if installed.
        // Given the previous scripts, it seems we might rely on an `exec_sql` RPC function or similar.
        // Let's check if we have a way to execute SQL. 
        // If not, we might need to use the `pg` library or `postgres` connection string if available.

        // Check for postgres connection string in env
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            console.log('🔌 Usando conexión directa a PostgreSQL...');
            // We need 'pg' or similar. Let's assume we can use a simple split and run approach if we had a direct connection tool, 
            // but since we are in a script, let's try to use the `pg` library if it's in package.json (it usually is in backend).
            // But this is running from root/scripts.

            // Alternative: Use the existing `scripts/execute-supabase-sql.js` logic if it exists, but I'll implement a simple one here using `postgres` package if available, or just try to use the `rpc` if `exec_sql` exists.

            // Let's try to call a common RPC for SQL execution if it exists, otherwise we warn.
            // Actually, looking at the file list, there is `scripts/execute-supabase-sql.js`. 
            // I should probably just use that script or replicate its logic.
            // Let's try to use the `rpc` 'exec_sql' which is common in these setups.

            const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

            if (error) {
                console.log('⚠️ Error ejecutando vía RPC exec_sql:', error.message);
                console.log('   Intentando método alternativo (split statements)...');
                // If RPC fails (maybe function doesn't exist), we can't easily run raw SQL via supabase-js client without that function.
                // We will try to use the `pg` library if available in the environment.
                try {
                    // Dynamic import to avoid build errors if pg is not installed
                    const { Client } = await import('pg');
                    const client = new Client({ connectionString: dbUrl });
                    await client.connect();
                    await client.query(sqlContent);
                    await client.end();
                    console.log('✅ SQL ejecutado correctamente vía conexión directa PostgreSQL.');
                } catch (pgError) {
                    console.error('❌ Falló la ejecución vía PostgreSQL directo:', pgError);
                    process.exit(1);
                }
            } else {
                console.log('✅ SQL ejecutado correctamente vía RPC.');
            }

        } else {
            console.log('❌ No se encontró DATABASE_URL para conexión directa y no se puede garantizar RPC.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error leyendo o ejecutando el script:', error);
        process.exit(1);
    }
}

applyCashFix();
