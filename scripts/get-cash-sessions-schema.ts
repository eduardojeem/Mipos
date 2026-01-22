import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCashSessionsSchema() {
    console.log('🔍 Querying cash_sessions table structure\n');

    // Query information_schema to get actual columns
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'cash_sessions'
            ORDER BY ordinal_position;
        `
    });

    if (error) {
        console.error('❌ Error:', error.message);

        // Fallback: Try to select from table and see what columns exist
        console.log('\nTrying fallback method...\n');
        const { data: sample, error: sampleError } = await supabase
            .from('cash_sessions')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Fallback failed:', sampleError.message);
        } else {
            console.log('✅ Sample row structure:');
            if (sample && sample.length > 0) {
                console.log(JSON.stringify(sample[0], null, 2));
                console.log('\nColumns:', Object.keys(sample[0]).join(', '));
            } else {
                console.log('   (Table is empty, cannot infer structure)');
                console.log('\n   Try inserting with minimal columns:');
                const testInsert = await supabase
                    .from('cash_sessions')
                    .insert({
                        user_id: '00000000-0000-0000-0000-000000000000',
                        opening_balance: 0,
                        status: 'open'
                    })
                    .select()
                    .single();

                if (testInsert.error) {
                    console.error('   ❌ Test insert failed:', testInsert.error.message);
                    console.error('      Code:', testInsert.error.code);
                } else {
                    console.log('   ✅ Test insert succeeded!');
                    console.log('      Columns:', Object.keys(testInsert.data).join(', '));

                    // Clean up
                    await supabase
                        .from('cash_sessions')
                        .delete()
                        .eq('id', testInsert.data.id);
                }
            }
        }
        return;
    }

    console.log('✅ Table structure:');
    console.log(JSON.stringify(data, null, 2));
}

getCashSessionsSchema();
