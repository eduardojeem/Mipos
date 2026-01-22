import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActualColumns() {
    console.log('🔍 Checking ACTUAL columns in cash_sessions table\n');

    try {
        // Method 1: Try to insert a minimal record and see what comes back
        console.log('Method 1: Attempting minimal insert...\n');

        const { data: testInsert, error: insertError } = await supabase
            .from('cash_sessions')
            .insert({
                user_id: '00000000-0000-0000-0000-000000000000',
                status: 'open'
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('❌ Insert failed:', insertError.message);
            console.error('   Code:', insertError.code);
            console.error('   Details:', insertError.details);
            console.error('   Hint:', insertError.hint);
        } else {
            console.log('✅ Insert succeeded! Here are ALL the columns:');
            console.log('');
            const columns = Object.keys(testInsert);
            columns.forEach(col => {
                console.log(`   - ${col}: ${typeof testInsert[col]} = ${testInsert[col]}`);
            });

            console.log('\n📋 Column names only:');
            console.log('   ', columns.join(', '));

            // Clean up
            await supabase
                .from('cash_sessions')
                .delete()
                .eq('id', testInsert.id);
            console.log('\n✅ Test record deleted');
        }

        // Method 2: Try to select from existing records
        console.log('\n\nMethod 2: Selecting existing records...\n');
        const { data: existing, error: selectError } = await supabase
            .from('cash_sessions')
            .select('*')
            .limit(1);

        if (selectError) {
            console.error('❌ Select failed:', selectError.message);
        } else if (existing && existing.length > 0) {
            console.log('✅ Found existing record:');
            console.log('');
            const columns = Object.keys(existing[0]);
            columns.forEach(col => {
                console.log(`   - ${col}: ${existing[0][col]}`);
            });
        } else {
            console.log('ℹ️  No existing records found');
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
    }
}

checkActualColumns();
