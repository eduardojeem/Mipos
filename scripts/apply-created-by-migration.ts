import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🔄 Applying migration: Add created_by to cash_movements\n');

    try {
        // Read migration file
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251201_add_created_by_to_cash_movements.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n' + '='.repeat(60) + '\n');

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);

            const { data, error } = await supabase.rpc('exec_sql', {
                sql: statement + ';'
            });

            if (error) {
                // Some errors are acceptable (e.g., column already exists)
                if (error.message.includes('already exists')) {
                    console.log(`⚠️  Warning: ${error.message}`);
                } else {
                    console.error(`❌ Error: ${error.message}`);
                    throw error;
                }
            } else {
                console.log('✅ Success');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration applied successfully!\n');

        // Verify the column was added
        console.log('🔍 Verifying migration...\n');

        const { data: testData, error: testError } = await supabase
            .from('cash_movements')
            .select('id, created_by')
            .limit(1);

        if (testError) {
            console.error('❌ Verification failed:', testError.message);
        } else {
            console.log('✅ Column `created_by` exists and is accessible');
            console.log('✅ Migration verified successfully!\n');
        }

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

applyMigration();
