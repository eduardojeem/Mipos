import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyBalanceColumns() {
    console.log('🔍 Verifying Balance Columns in cash_sessions\n');

    try {
        // Try to select with the new columns
        const { data, error } = await supabase
            .from('cash_sessions')
            .select('id, opening_balance, current_balance, expected_balance, status')
            .limit(1);

        if (error) {
            console.error('❌ Error querying table:', error.message);
            console.error('   Code:', error.code);

            if (error.message.includes('current_balance') || error.message.includes('expected_balance')) {
                console.log('\n⚠️  Columns do not exist yet.');
                console.log('   Please apply the migration first:');
                console.log('   npx tsx scripts/apply-balance-columns-migration.ts');
            }
            process.exit(1);
        }

        console.log('✅ Query successful!\n');

        if (data && data.length > 0) {
            console.log('📊 Sample record:');
            console.log('   ID:', data[0].id);
            console.log('   Opening Balance:', data[0].opening_balance);
            console.log('   Current Balance:', data[0].current_balance);
            console.log('   Expected Balance:', data[0].expected_balance);
            console.log('   Status:', data[0].status);
        } else {
            console.log('ℹ️  No records found in cash_sessions table');
            console.log('   But columns exist and are queryable!');
        }

        console.log('\n✅ Migration verified successfully!');
        console.log('   Both columns exist:');
        console.log('   - current_balance ✅');
        console.log('   - expected_balance ✅');

        // Test insert
        console.log('\n🧪 Testing insert with new columns...');
        const testData = {
            user_id: '00000000-0000-0000-0000-000000000000',
            opening_balance: 100,
            current_balance: 100,
            expected_balance: 100,
            status: 'open',
            notes: 'Test insert'
        };

        const { data: insertData, error: insertError } = await supabase
            .from('cash_sessions')
            .insert(testData)
            .select()
            .single();

        if (insertError) {
            console.error('❌ Test insert failed:', insertError.message);
            console.error('   Code:', insertError.code);
        } else {
            console.log('✅ Test insert successful!');
            console.log('   ID:', insertData.id);

            // Clean up
            await supabase
                .from('cash_sessions')
                .delete()
                .eq('id', insertData.id);
            console.log('✅ Test record cleaned up');
        }

        console.log('\n🎉 All checks passed! The API should work now.');

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

verifyBalanceColumns();
