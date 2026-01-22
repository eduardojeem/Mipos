import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseProducts() {
    console.log('Testing Supabase product fetching...');

    try {
        const { data, error, count } = await supabase
            .from('products')
            .select('*, category:categories(*)', { count: 'exact' })
            .range(0, 9);

        if (error) {
            console.error('Error fetching products:', error);
            return;
        }

        console.log(`Successfully fetched ${data.length} products (Total: ${count})`);

        if (data.length > 0) {
            console.log('First product sample:', {
                id: data[0].id,
                name: data[0].name,
                category: data[0].category?.name
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testSupabaseProducts();
