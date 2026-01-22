import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyColumn() {
    console.log('🔍 Checking if created_by column exists...\n');

    // Try to insert a test record with created_by
    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('id')
        .limit(1)
        .maybeSingle();

    if (!session) {
        console.log('⚠️  No cash sessions found, cannot test fully');
        console.log('   But we can check the table structure\n');
    }

    // Try to select created_by column
    const { data, error } = await supabase
        .from('cash_movements')
        .select('id, session_id, type, amount, created_by')
        .limit(1);

    if (error) {
        if (error.message.includes('does not exist')) {
            console.log('❌ Column `created_by` does NOT exist');
            console.log('   Error:', error.message);
            console.log('\n📝 You need to run the migration manually in Supabase SQL Editor:');
            console.log('   1. Go to Supabase Dashboard → SQL Editor');
            console.log('   2. Copy the content of: supabase/migrations/20251201_add_created_by_to_cash_movements.sql');
            console.log('   3. Execute it\n');
        } else {
            console.log('❌ Error:', error.message);
        }
    } else {
        console.log('✅ Column `created_by` EXISTS!');
        console.log('✅ Migration was successful!\n');

        if (data && data.length > 0) {
            console.log('Sample data:', data[0]);
        } else {
            console.log('(Table is empty, but column exists)');
        }
    }
}

verifyColumn();
