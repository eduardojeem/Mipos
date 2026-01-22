const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createSaleItemsTableDirect() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials');
      process.exit(1);
    }

    console.log('🔗 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the table with a single SQL statement
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.sale_items (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          sale_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          
          CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) 
              REFERENCES public.sales(id) ON DELETE CASCADE,
          CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) 
              REFERENCES public.products(id) ON DELETE CASCADE,
          
          CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
          CONSTRAINT sale_items_unit_price_positive CHECK (unit_price >= 0)
      );
    `;

    console.log('📝 Creating sale_items table...');
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
    } else {
      console.log('✅ Table created successfully');
    }

    // Enable RLS
    console.log('🔒 Enabling RLS...');
    const { data: rlsResult, error: rlsError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;' 
    });

    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled');
    }

    // Create RLS policies
    const policies = [
      "CREATE POLICY \"Enable read access for authenticated users\" ON public.sale_items FOR SELECT USING (auth.role() = 'authenticated');",
      "CREATE POLICY \"Enable insert for authenticated users\" ON public.sale_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');",
      "CREATE POLICY \"Enable update for authenticated users\" ON public.sale_items FOR UPDATE USING (auth.role() = 'authenticated');",
      "CREATE POLICY \"Enable delete for authenticated users\" ON public.sale_items FOR DELETE USING (auth.role() = 'authenticated');"
    ];

    console.log('🛡️ Creating RLS policies...');
    for (let i = 0; i < policies.length; i++) {
      const { data, error } = await supabase.rpc('exec_sql', { sql: policies[i] });
      if (error) {
        console.error(`❌ Error creating policy ${i + 1}:`, error);
      } else {
        console.log(`✅ Policy ${i + 1} created`);
      }
    }

    // Wait a moment for schema cache to update
    console.log('⏳ Waiting for schema cache to update...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test table access
    console.log('🔍 Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('sale_items')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Table access test failed:', testError);
      console.log('ℹ️ This might be normal if the schema cache hasn\'t updated yet');
    } else {
      console.log('✅ Table is accessible!');
    }

    console.log('🎉 Setup completed!');

  } catch (err) {
    console.error('❌ Script error:', err.message);
    process.exit(1);
  }
}

createSaleItemsTableDirect();