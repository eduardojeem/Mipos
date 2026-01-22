const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestProduct() {
  try {
    // First, get an existing category
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);

    if (categoryError) {
      console.error('Error fetching categories:', categoryError);
      return;
    }

    if (!categories || categories.length === 0) {
      console.error('No categories found');
      return;
    }

    const categoryId = categories[0].id;
    console.log('Using category:', categories[0].name, 'ID:', categoryId);

    // Create a test product
    const productData = {
      name: 'Producto de Prueba Checkout',
      sku: 'TEST-CHECKOUT-001',
      description: 'Producto creado para probar el flujo de checkout público',
      categoryId: categoryId, // Using Prisma field name
      costPrice: 8.00,
      salePrice: 15.50,
      stockQuantity: 100,
      minStock: 5,
      images: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return;
    }

    console.log('✅ Test product created successfully!');
    console.log('Product ID:', product.id);
    console.log('Product Name:', product.name);
    console.log('SKU:', product.sku);
    console.log('Sale Price:', product.sale_price);
    console.log('Stock:', product.stock_quantity);

    return product;
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestProduct();