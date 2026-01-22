const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestProduct() {
  try {
    console.log('Conectando a Supabase...');
    
    // Primero obtener una categoría existente
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (categoryError) {
      console.error('Error obteniendo categorías:', categoryError);
      return;
    }
    
    if (!categories || categories.length === 0) {
      console.error('No se encontraron categorías');
      return;
    }
    
    const categoryId = categories[0].id;
    console.log('Usando categoría ID:', categoryId);
    
    // Crear el producto
    const productData = {
      name: 'Producto de Prueba Checkout',
      sku: 'TEST-CHECKOUT-001',
      description: 'Producto para probar el flujo de checkout',
      category_id: categoryId,
      cost_price: 8.00,
      sale_price: 15.50,
      stock_quantity: 100,
      min_stock: 5,
      images: []
    };
    
    console.log('Insertando producto:', productData);
    
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (productError) {
      console.error('Error creando producto:', productError);
      return;
    }
    
    console.log('Producto creado exitosamente:', product);
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

createTestProduct();