import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyBalanceColumnsMigration() {
    console.log('🔧 Applying Balance Columns Migration\n');

    try {
        // Read the migration file
        const migrationPath = path.join(
            process.cwd(),
            'supabase',
            'migrations',
            '20251201_add_balance_columns_to_cash_sessions.sql'
        );

        if (!fs.existsSync(migrationPath)) {
            console.error('❌ Migration file not found:', migrationPath);
            process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Migration file loaded');
        console.log('📍 Path:', migrationPath);
        console.log('');

        // Check current table structure
        console.log('Step 1: Checking current table structure...');
        const { data: beforeCheck, error: beforeError } = await supabase
            .from('cash_sessions')
            .select('*')
            .limit(1);

        if (beforeError) {
            console.error('❌ Error checking table:', beforeError.message);
        } else {
            const columns = beforeCheck && beforeCheck.length > 0
                ? Object.keys(beforeCheck[0])
                : [];
            console.log('✅ Current columns:', columns.join(', '));

            const hasCurrentBalance = columns.includes('current_balance');
            const hasExpectedBalance = columns.includes('expected_balance');

            console.log('   - current_balance:', hasCurrentBalance ? '✅ EXISTS' : '❌ MISSING');
            console.log('   - expected_balance:', hasExpectedBalance ? '✅ EXISTS' : '❌ MISSING');

            if (hasCurrentBalance && hasExpectedBalance) {
                console.log('\n✅ All columns already exist! No migration needed.');
                return;
            }
        }

        console.log('\n⚠️  MIGRATION REQUIRED\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  MANUAL ACTION REQUIRED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('This script cannot apply the migration automatically.');
        console.log('Please follow these steps:');
        console.log('');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('   URL:', `${supabaseUrl.replace('/rest/v1', '')}/project/_/sql`);
        console.log('');
        console.log('2. Copy the content of:');
        console.log('   supabase/migrations/20251201_add_balance_columns_to_cash_sessions.sql');
        console.log('');
        console.log('3. Paste and execute it in the SQL Editor');
        console.log('');
        console.log('4. Run this verification script:');
        console.log('   npx tsx scripts/verify-balance-columns.ts');
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

applyBalanceColumnsMigration();
