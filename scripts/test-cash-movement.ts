import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCashMovement() {
    console.log('🧪 Testing Cash Movement Creation\n');

    try {
        // Step 1: Get an open session
        console.log('Step 1: Finding an open session...');
        const { data: openSessions, error: sessionError } = await supabase
            .from('cash_sessions')
            .select('*')
            .eq('status', 'OPEN')
            .limit(1);

        if (sessionError) {
            console.error('❌ Error finding session:', sessionError.message);
            return;
        }

        if (!openSessions || openSessions.length === 0) {
            console.log('❌ No open session found. Please open a session first.');
            return;
        }

        const session = openSessions[0];
        console.log('✅ Found open session:', session.id);
        console.log('   Opened at:', session.opened_at);
        console.log('   Opening amount:', session.opening_amount);

        // Step 2: Try to create a movement
        console.log('\nStep 2: Creating a test movement...');

        const testMovement = {
            session_id: session.id,
            type: 'ADJUSTMENT',
            amount: 10,
            reason: 'Test movement'
        };

        console.log('   Movement data:', testMovement);

        const { data: movement, error: movementError } = await supabase
            .from('cash_movements')
            .insert(testMovement)
            .select('*')
            .single();

        if (movementError) {
            console.error('\n❌ MOVEMENT INSERT FAILED:');
            console.error('   Message:', movementError.message);
            console.error('   Code:', movementError.code);
            console.error('   Details:', movementError.details);
            console.error('   Hint:', movementError.hint);

            // Try to discover what columns are expected
            console.log('\n🔍 Checking cash_movements schema...');
            const { data: movements, error: schemaError } = await supabase
                .from('cash_movements')
                .select('*')
                .limit(1);

            if (schemaError) {
                console.error('   Schema check failed:', schemaError.message);
            } else if (movements && movements.length > 0) {
                console.log('   Existing movement columns:', Object.keys(movements[0]));
            } else {
                console.log('   No existing movements to check schema');
            }
        } else {
            console.log('\n✅ MOVEMENT CREATED SUCCESSFULLY!');
            console.log('   Movement ID:', movement.id);
            console.log('   Type:', movement.type);
            console.log('   Amount:', movement.amount);
            console.log('   All columns:', Object.keys(movement));

            // Clean up
            console.log('\n🧹 Cleaning up test movement...');
            await supabase
                .from('cash_movements')
                .delete()
                .eq('id', movement.id);
            console.log('✅ Test movement deleted');
        }

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        console.error(error.stack);
    }
}

testCashMovement();
