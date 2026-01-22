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

async function getTableSchema(tableName: string) {
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = '${tableName}'
            ORDER BY ordinal_position;
        `
    });

    if (error) {
        // Try alternative method using direct query
        const { data: schemaData, error: schemaError } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);

        if (schemaError) {
            console.error(`❌ Error getting schema for ${tableName}:`, schemaError.message);
            return null;
        }

        console.log(`\n📋 Table: ${tableName}`);
        console.log('⚠️ Cannot query information_schema, but table exists');
        return { exists: true, columns: [] };
    }

    return data;
}

async function main() {
    console.log('🔍 Querying Cash Tables Schema...\n');
    console.log('='.repeat(60));

    // Check cash_sessions
    console.log('\n📋 CASH_SESSIONS TABLE');
    console.log('='.repeat(60));

    const sessionsSchema = await getTableSchema('cash_sessions');
    if (sessionsSchema) {
        console.log(JSON.stringify(sessionsSchema, null, 2));
    }

    // Check cash_movements
    console.log('\n📋 CASH_MOVEMENTS TABLE');
    console.log('='.repeat(60));

    const movementsSchema = await getTableSchema('cash_movements');
    if (movementsSchema) {
        console.log(JSON.stringify(movementsSchema, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Schema query complete');
}

main();
