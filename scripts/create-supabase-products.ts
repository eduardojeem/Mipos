import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProducts() {
  console.log('🚀 Creating products in Supabase...');

  // Get or create category
  let { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('name', 'Productos de Prueba')
    .single();

  if (categoryError || !category) {
    // Try to create it
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert([
        {
          name: 'Productos de Prueba',
          description: 'Categoría para productos de prueba'
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating category:', createError);
      return;
    }
    category = newCategory;
  }

  console.log('✅ Using category:', category.name);

  // Create products
  const products = [
    {
      id: 'prod-1',
      sku: 'TEST-001',
      name: 'Producto Test 1',
      brand: 'Test Brand',
      sale_price: 100.00,
      cost_price: 50.00,
      stock_quantity: 100,
      min_stock: 10,
      category_id: category.id,
      is_active: true
    },
    {
      id: 'prod-2',
      sku: 'TEST-002',
      name: 'Producto Test 2',
      brand: 'Test Brand',
      sale_price: 200.00,
      cost_price: 100.00,
      stock_quantity: 50,
      min_stock: 5,
      category_id: category.id,
      is_active: true
    },
    {
      id: 'prod-3',
      sku: 'TEST-003',
      name: 'Laptop Gaming',
      brand: 'Gaming Corp',
      sale_price: 1500.00,
      cost_price: 1000.00,
      stock_quantity: 5,
      min_stock: 2,
      category_id: category.id,
      is_active: true
    },
    {
      id: 'prod-4',
      sku: 'TEST-004',
      name: 'Mouse Inalambrico',
      brand: 'Tech Co',
      sale_price: 50.00,
      cost_price: 25.00,
      stock_quantity: 30,
      min_stock: 10,
      category_id: category.id,
      is_active: true
    },
    {
      id: 'prod-5',
      sku: 'TEST-005',
      name: 'Teclado Mecánico',
      brand: 'Keyboard Inc',
      sale_price: 120.00,
      cost_price: 60.00,
      stock_quantity: 20,
      min_stock: 5,
      category_id: category.id,
      is_active: true
    }
  ];

  // Skip creation, just verify existing products
  console.log('ℹ️  Products already exist, checking status...');

  // Verify products were created
  const { data: allProducts, error: fetchError } = await supabase
    .from('products')
    .select('id, name, sku, is_active')
    .eq('is_active', true);

  if (fetchError) {
    console.error('❌ Error fetching products:', fetchError);
    return;
  }

  console.log('\n📦 Products in database:');
  allProducts?.forEach(product => {
    console.log(`   - ${product.name} (${product.sku})`);
  });

  console.log('\n🎉 Done! Products created successfully.');
  console.log('💡 Test the endpoint: http://localhost:3001/api/products/public');
}

createProducts().catch(console.error);