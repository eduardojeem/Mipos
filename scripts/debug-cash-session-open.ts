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

async function debugCashSessionOpening() {
    console.log('🔍 Debugging Cash Session Opening\n');
    console.log('Environment:');
    console.log('  SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('  SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    console.log('');

    try {
        // Step 1: Check for existing open sessions
        console.log('Step 1: Checking for existing open sessions...');
        const { data: existingSessions, error: checkError } = await supabase
            .from('cash_sessions')
            .select('id, status, opened_at')
            .eq('status', 'open')
            .limit(1);

        if (checkError) {
            console.error('❌ Error checking sessions:', checkError.message);
            console.error('   Code:', checkError.code);
            console.error('   Details:', checkError.details);
            return;
        }

        if (existingSessions && existingSessions.length > 0) {
            console.log('⚠️  Found existing open session:', existingSessions[0].id);
            console.log('   Closing it first for testing...\n');

            const { error: closeError } = await supabase
                .from('cash_sessions')
                .update({ status: 'closed', closed_at: new Date().toISOString() })
                .eq('id', existingSessions[0].id);

            if (closeError) {
                console.error('❌ Error closing session:', closeError.message);
                return;
            }
            console.log('✅ Session closed\n');
        } else {
            console.log('✅ No open sessions found\n');
        }

        // Step 2: Try to create a new session
        console.log('Step 2: Creating new cash session...');

        const testData = {
            user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
            opening_balance: 100,
            current_balance: 100,
            expected_balance: 100,
            status: 'open',
            notes: 'Debug test session'
        };

        console.log('Insert data:', JSON.stringify(testData, null, 2));

        const { data: newSession, error: insertError } = await supabase
            .from('cash_sessions')
            .insert(testData)
            .select()
            .single();

        if (insertError) {
            console.error('\n❌ INSERT ERROR:');
            console.error('   Message:', insertError.message);
            console.error('   Code:', insertError.code);
            console.error('   Details:', insertError.details);
            console.error('   Hint:', insertError.hint);

            // Try to get more info about the table structure
            console.log('\nStep 3: Checking table structure...');
            const { data: columns, error: schemaError } = await supabase
                .from('cash_sessions')
                .select('*')
                .limit(0);

            if (schemaError) {
                console.error('❌ Cannot query table structure:', schemaError.message);
            } else {
                console.log('✅ Table exists and is accessible');
            }

            return;
        }

        console.log('\n✅ Session created successfully!');
        console.log('   ID:', newSession.id);
        console.log('   Status:', newSession.status);
        console.log('   Opening Balance:', newSession.opening_balance);
        console.log('   Opened At:', newSession.opened_at);

        // Clean up
        console.log('\nCleaning up test session...');
        await supabase
            .from('cash_sessions')
            .delete()
            .eq('id', newSession.id);
        console.log('✅ Test session deleted\n');

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        console.error('   Stack:', error.stack);
    }
}

debugCashSessionOpening();
