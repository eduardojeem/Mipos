import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function closeOpenSessions() {
    console.log('🔧 Closing All Open Cash Sessions\n');

    try {
        // Find all open sessions
        console.log('Step 1: Finding open sessions...');
        const { data: openSessions, error: findError } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('status', 'OPEN');

        if (findError) {
            console.error('❌ Error finding sessions:', findError.message);
            return;
        }

        if (!openSessions || openSessions.length === 0) {
            console.log('✅ No open sessions found. You can now open a new session.');
            return;
        }

        console.log(`✅ Found ${openSessions.length} open session(s):\n`);
        openSessions.forEach((session, index) => {
            console.log(`   ${index + 1}. ID: ${session.id}`);
            console.log(`      Opened at: ${session.opened_at}`);
            console.log(`      Opening amount: ${session.opening_amount}`);
            console.log(`      Notes: ${session.notes || 'N/A'}`);
            console.log('');
        });

        // Close all open sessions
        console.log('Step 2: Closing all open sessions...');
        const { data: closedSessions, error: closeError } = await supabase
            .from('cash_sessions')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString(),
                closing_amount: 0 // You can adjust this if needed
            })
            .eq('status', 'OPEN')
            .select();

        if (closeError) {
            console.error('❌ Error closing sessions:', closeError.message);
            return;
        }

        console.log(`✅ Successfully closed ${closedSessions?.length || 0} session(s)\n`);

        // Verify
        console.log('Step 3: Verifying...');
        const { data: remainingOpen, error: verifyError } = await supabase
            .from('cash_sessions')
            .select('id')
            .eq('status', 'OPEN');

        if (verifyError) {
            console.error('❌ Error verifying:', verifyError.message);
        } else {
            const count = remainingOpen?.length || 0;
            if (count === 0) {
                console.log('✅ All sessions closed successfully!');
                console.log('\n🎉 You can now open a new cash session from the UI');
            } else {
                console.log(`⚠️  Still ${count} open session(s) remaining`);
            }
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
    }
}

closeOpenSessions();
