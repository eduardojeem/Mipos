import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function discoverSchema() {
    console.log('🔍 Discovering cash_sessions Schema\n');

    try {
        // Try insert with opened_by instead of user_id
        console.log('Attempting insert with opened_by column...\n');

        const { data: testInsert, error: insertError } = await supabase
            .from('cash_sessions')
            .insert({
                opened_by: '00000000-0000-0000-0000-000000000000',
                status: 'open',
                initial_amount: 0 // Try this column name
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('❌ Insert failed:', insertError.message);
            console.error('   Code:', insertError.code);

            // Try different column combinations
            console.log('\nTrying alternative column names...\n');

            const alternatives = [
                { opened_by: '00000000-0000-0000-0000-000000000000', status: 'open', opening_amount: 0 },
                { opened_by: '00000000-0000-0000-0000-000000000000', status: 'open', opening_balance: 0 },
                { opened_by: '00000000-0000-0000-0000-000000000000', status: 'open' },
            ];

            for (const alt of alternatives) {
                console.log(`Trying:`, Object.keys(alt).join(', '));
                const { data, error } = await supabase
                    .from('cash_sessions')
                    .insert(alt)
                    .select('*')
                    .single();

                if (!error) {
                    console.log('✅ SUCCESS! These columns work:\n');
                    const columns = Object.keys(data);
                    columns.forEach(col => {
                        const value = data[col];
                        const type = typeof value;
                        console.log(`   ${col}: ${type} = ${value}`);
                    });

                    console.log('\n📋 All column names:');
                    console.log('   ', columns.join(', '));

                    // Clean up
                    await supabase
                        .from('cash_sessions')
                        .delete()
                        .eq('id', data.id);

                    return;
                } else {
                    console.log(`   ❌ ${error.message}\n`);
                }
            }
        } else {
            console.log('✅ Insert succeeded!\n');
            const columns = Object.keys(testInsert);
            columns.forEach(col => {
                console.log(`   ${col}: ${testInsert[col]}`);
            });

            console.log('\n📋 Column names:');
            console.log('   ', columns.join(', '));

            // Clean up
            await supabase
                .from('cash_sessions')
                .delete()
                .eq('id', testInsert.id);
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
    }
}

discoverSchema();
