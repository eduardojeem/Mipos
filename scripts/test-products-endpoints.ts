import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEndpoints() {
  console.log('🧪 Testing Products Endpoints...\n');

  // Test 1: Check products in database
  console.log('1️⃣ Checking products in database...');
  const { data: allProducts, error: allError } = await supabase
    .from('products')
    .select('id, name, sale_price, is_active')
    .limit(5);

  if (allError) {
    console.error('❌ Error fetching products:', allError);
    return;
  }

  console.log(`✅ Found ${allProducts?.length || 0} products in database`);
  if (allProducts && allProducts.length > 0) {
    console.log('📦 Sample products:');
    allProducts.forEach(p => {
      console.log(`   - ${p.name}: $${p.sale_price} (active: ${p.is_active})`);
    });
  }

  // Test 2: Check active products
  console.log('\n2️⃣ Checking active products...');
  const { data: activeProducts, error: activeError } = await supabase
    .from('products')
    .select('id, name, sale_price, is_active')
    .eq('is_active', true)
    .limit(5);

  if (activeError) {
    console.error('❌ Error fetching active products:', activeError);
    return;
  }

  console.log(`✅ Found ${activeProducts?.length || 0} active products`);
  if (activeProducts && activeProducts.length > 0) {
    console.log('📦 Active products:');
    activeProducts.forEach(p => {
      console.log(`   - ${p.name}: $${p.sale_price}`);
    });
  }

  // Test 3: Test public endpoint
  console.log('\n3️⃣ Testing public endpoint...');
  try {
    const response = await fetch('http://localhost:3001/api/products/public?limit=3');
    const data = await response.json();
    
    console.log('📡 Endpoint response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Count: ${data.count}`);
    
    if (data.products && data.products.length > 0) {
      console.log('📦 Products from endpoint:');
      data.products.forEach((p: any) => {
        console.log(`   - ${p.name}: $${p.salePrice || p.price || 0}`);
      });
    } else {
      console.log('⚠️  No products returned from endpoint');
    }
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }

  // Test 4: Check promotions for association test
  console.log('\n4️⃣ Checking promotions...');
  const { data: promotions, error: promoError } = await supabase
    .from('promotions')
    .select('id, name')
    .limit(3);

  if (promoError) {
    console.error('❌ Error fetching promotions:', promoError);
    return;
  }

  console.log(`✅ Found ${promotions?.length || 0} promotions`);
  if (promotions && promotions.length > 0) {
    console.log('🎯 Available promotions:');
    promotions.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });

    // Test 5: Test product association
    if (activeProducts && activeProducts.length > 0) {
      console.log('\n5️⃣ Testing product association...');
      const testPromotion = promotions[0];
      const testProduct = activeProducts[0];

      try {
        const response = await fetch(`http://localhost:3001/api/promotions/${testPromotion.id}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds: [testProduct.id]
          })
        });

        const data = await response.json();
        console.log('📡 Association response:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Success: ${data.success}`);
        console.log(`   Message: ${data.message}`);

        if (data.success) {
          console.log('✅ Product association works!');
        } else {
          console.log('❌ Product association failed');
        }
      } catch (error) {
        console.error('❌ Error testing association:', error);
      }
    }
  }

  console.log('\n🎉 Test completed!');
}

testEndpoints().catch(console.error);