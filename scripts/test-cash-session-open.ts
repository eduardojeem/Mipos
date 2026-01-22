import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCashSessionOpen() {
    console.log('🧪 Testing Cash Session Open\n');

    try {
        // Step 1: Get a real user ID
        console.log('Step 1: Getting user ID...');
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError || !users || users.length === 0) {
            console.error('❌ No users found:', usersError?.message);
            return;
        }

        const testUser = users[0];
        console.log('✅ Using user:', testUser.email, '(', testUser.id, ')');

        // Step 2: Check for existing open sessions
        console.log('\nStep 2: Checking for existing open sessions...');
        const { data: existingSessions, error: checkError } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('status', 'OPEN');

        if (checkError) {
            console.error('❌ Error checking sessions:', checkError.message);
        } else {
            console.log(`✅ Found ${existingSessions?.length || 0} open sessions`);
            if (existingSessions && existingSessions.length > 0) {
                console.log('   Existing sessions:', existingSessions.map(s => ({
                    id: s.id,
                    status: s.status,
                    opened_at: s.opened_at
                })));
            }
        }

        // Step 3: Try to insert a new session
        console.log('\nStep 3: Attempting to insert new session...');
        const testData = {
            user_id: testUser.id,
            opened_by: testUser.id,
            opening_amount: 100,
            status: 'OPEN',
            opened_at: new Date().toISOString(),
            notes: 'Test session'
        };

        console.log('   Insert data:', testData);

        const { data: newSession, error: insertError } = await supabase
            .from('cash_sessions')
            .insert(testData)
            .select('*')
            .single();

        if (insertError) {
            console.error('\n❌ INSERT FAILED:');
            console.error('   Message:', insertError.message);
            console.error('   Code:', insertError.code);
            console.error('   Details:', insertError.details);
            console.error('   Hint:', insertError.hint);

            // Try to understand what columns are expected
            console.log('\n🔍 Trying minimal insert to discover schema...');
            const { data: minimal, error: minError } = await supabase
                .from('cash_sessions')
                .insert({
                    opened_by: testUser.id,
                    status: 'OPEN'
                })
                .select('*')
                .single();

            if (minError) {
                console.error('   Minimal insert also failed:', minError.message);
            } else {
                console.log('✅ Minimal insert succeeded!');
                console.log('   Columns:', Object.keys(minimal));

                // Clean up
                await supabase
                    .from('cash_sessions')
                    .delete()
                    .eq('id', minimal.id);
            }
        } else {
            console.log('\n✅ INSERT SUCCESSFUL!');
            console.log('   Session ID:', newSession.id);
            console.log('   Status:', newSession.status);
            console.log('   Opened at:', newSession.opened_at);
            console.log('   All columns:', Object.keys(newSession));

            // Clean up
            console.log('\n🧹 Cleaning up test session...');
            await supabase
                .from('cash_sessions')
                .delete()
                .eq('id', newSession.id);
            console.log('✅ Test session deleted');
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        console.error(error.stack);
    }
}

testCashSessionOpen();
