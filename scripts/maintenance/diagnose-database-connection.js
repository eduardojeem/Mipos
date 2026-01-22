const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

// Configuración desde .env
const supabaseUrl = 'https://zrbzkmfloiurwhydpvap.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyYnprbWZsb2l1cndoeWRwdmFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI2MzUxOSwiZXhwIjoyMDc0ODM5NTE5fQ.3CTK3Z2Et3ydra7ZWQI9oArzMGErNzUPgyop6d1moRo';
const databaseUrl = 'postgresql://postgres.zrbzkmfloiurwhydpvap:[Eduqwerty..,,95]@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

async function testSupabaseAPI() {
    console.log('🔍 Testing Supabase API connection...');
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Test categories table
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .limit(3);
            
        if (error) {
            console.log('❌ Supabase API Error:', error.message);
            return false;
        }
        
        console.log('✅ Supabase API connection successful');
        console.log('📊 Categories data:', data);
        return true;
    } catch (error) {
        console.log('❌ Supabase API Exception:', error.message);
        return false;
    }
}

async function testDirectPostgreSQL() {
    console.log('\n🔍 Testing direct PostgreSQL connection...');
    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('✅ PostgreSQL connection established');
        
        // Test simple query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Simple query successful:', result.rows[0]);
        
        // Test categories table
        const categoriesResult = await client.query('SELECT COUNT(*) as count FROM public.categories');
        console.log('✅ Categories table accessible:', categoriesResult.rows[0]);
        
        await client.end();
        return true;
    } catch (error) {
        console.log('❌ PostgreSQL Error:', error.message);
        try {
            await client.end();
        } catch (e) {}
        return false;
    }
}

async function testAlternativeConnectionString() {
    console.log('\n🔍 Testing alternative connection string format...');
    
    // Try with different connection string format
    const altConnectionString = 'postgresql://postgres.zrbzkmfloiurwhydpvap:Eduqwerty..,,95@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
    
    const client = new Client({
        connectionString: altConnectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('✅ Alternative connection string works');
        
        const result = await client.query('SELECT COUNT(*) as count FROM public.categories');
        console.log('✅ Categories accessible with alt connection:', result.rows[0]);
        
        await client.end();
        return altConnectionString;
    } catch (error) {
        console.log('❌ Alternative connection failed:', error.message);
        try {
            await client.end();
        } catch (e) {}
        return null;
    }
}

async function main() {
    console.log('🚀 Starting database connection diagnosis...\n');
    
    const supabaseWorks = await testSupabaseAPI();
    const postgresWorks = await testDirectPostgreSQL();
    const altConnection = await testAlternativeConnectionString();
    
    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Supabase API: ${supabaseWorks ? '✅ Working' : '❌ Failed'}`);
    console.log(`Direct PostgreSQL: ${postgresWorks ? '✅ Working' : '❌ Failed'}`);
    console.log(`Alternative format: ${altConnection ? '✅ Working' : '❌ Failed'}`);
    
    if (altConnection && !postgresWorks) {
        console.log('\n💡 RECOMMENDATION:');
        console.log('Update DATABASE_URL to:');
        console.log(altConnection);
    }
    
    if (!supabaseWorks && !postgresWorks && !altConnection) {
        console.log('\n⚠️  ISSUE: All connection methods failed');
        console.log('Please check:');
        console.log('1. Supabase project is active (not paused)');
        console.log('2. Database credentials are correct');
        console.log('3. Network connectivity');
    }
}

main().catch(console.error);