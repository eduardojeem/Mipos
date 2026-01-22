const { Client } = require('pg');

// Diferentes formatos de conexión para probar
const connectionStrings = [
    // Conexión directa (no pooler)
    'postgresql://postgres.zrbzkmfloiurwhydpvap:[Eduqwerty..,,95]@db.zrbzkmfloiurwhydpvap.supabase.co:5432/postgres',
    
    // Con parámetros SSL
    'postgresql://postgres.zrbzkmfloiurwhydpvap:[Eduqwerty..,,95]@db.zrbzkmfloiurwhydpvap.supabase.co:5432/postgres?sslmode=require',
    
    // Formato alternativo
    'postgresql://postgres:[Eduqwerty..,,95]@db.zrbzkmfloiurwhydpvap.supabase.co:5432/postgres',
    
    // Con schema específico
    'postgresql://postgres.zrbzkmfloiurwhydpvap:[Eduqwerty..,,95]@db.zrbzkmfloiurwhydpvap.supabase.co:5432/postgres?schema=public'
];

async function testConnection(connectionString, index) {
    console.log(`\n🔍 Testing connection ${index + 1}:`);
    console.log(`URL: ${connectionString.replace(/:\[.*?\]@/, ':***@')}`);
    
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log('✅ Connection successful');
        
        // Test basic query
        const timeResult = await client.query('SELECT NOW() as current_time');
        console.log('✅ Basic query works');
        
        // Test categories table
        const categoriesResult = await client.query('SELECT COUNT(*) as count FROM public.categories');
        console.log('✅ Categories table accessible:', categoriesResult.rows[0]);
        
        // Test sample data
        const sampleResult = await client.query('SELECT id, name FROM public.categories LIMIT 2');
        console.log('✅ Sample data:', sampleResult.rows);
        
        await client.end();
        return connectionString;
    } catch (error) {
        console.log('❌ Failed:', error.message);
        try {
            await client.end();
        } catch (e) {}
        return null;
    }
}

async function main() {
    console.log('🚀 Testing different Supabase connection formats...\n');
    
    let workingConnection = null;
    
    for (let i = 0; i < connectionStrings.length; i++) {
        const result = await testConnection(connectionStrings[i], i);
        if (result && !workingConnection) {
            workingConnection = result;
            console.log('\n🎉 FOUND WORKING CONNECTION!');
            break;
        }
    }
    
    console.log('\n📋 FINAL RESULT:');
    console.log('='.repeat(60));
    
    if (workingConnection) {
        console.log('✅ Working DATABASE_URL found:');
        console.log(workingConnection);
        console.log('\n💡 Update your .env file with this URL');
    } else {
        console.log('❌ No working connection found');
        console.log('Please check:');
        console.log('1. Supabase project settings');
        console.log('2. Database password');
        console.log('3. Project reference ID');
    }
}

main().catch(console.error);