const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertProductDirectly() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    
    // First, get an existing category
    console.log('📂 Obteniendo categorías existentes...');
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
    console.log('✅ Usando categoría:', categories[0].name, 'ID:', categoryId);

    // Insert product using raw SQL to avoid field mapping issues
    console.log('🛍️ Insertando producto usando SQL directo...');
    
    const { data: product, error: insertError } = await supabase.rpc('insert_test_product', {
      p_name: 'Producto de Prueba Checkout',
      p_sku: 'TEST-CHECKOUT-001',
      p_description: 'Producto creado para probar el flujo de checkout público',
      p_category_id: categoryId,
      p_cost_price: 8.00,
      p_sale_price: 15.50,
      p_stock_quantity: 100,
      p_min_stock: 5,
      p_images: ''
    });

    if (insertError) {
      console.error('Error insertando producto:', insertError);
      
      // Try alternative approach with direct SQL
      console.log('🔄 Intentando con SQL directo...');
      const sqlQuery = `
        INSERT INTO products (name, sku, description, category_id, cost_price, sale_price, stock_quantity, min_stock, images)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `;
      
      const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_sql', {
        query: sqlQuery,
        params: [
          'Producto de Prueba Checkout',
          'TEST-CHECKOUT-001',
          'Producto creado para probar el flujo de checkout público',
          categoryId,
          8.00,
          15.50,
          100,
          5,
          ''
        ]
      });

      if (sqlError) {
        console.error('Error con SQL directo:', sqlError);
        return;
      }

      console.log('✅ Producto insertado con SQL directo:', sqlResult);
      return;
    }

    console.log('✅ ¡Producto de prueba creado exitosamente!');
    console.log('📋 Detalles del producto:', product);

    return product;
  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

insertProductDirectly()
  .then(() => {
    console.log('🎉 Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });