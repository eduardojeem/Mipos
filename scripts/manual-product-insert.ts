import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('🚀 Iniciando creación manual de datos de prueba...');

  try {
    // 1. Obtener o crear categoría
    console.log('\n📁 Obteniendo categoría...');
    
    let { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', 'Manual Test')
      .limit(1);

    let categoryId: string;

    if (!categories || categories.length === 0) {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert([{ name: 'Manual Test', description: 'Categoria creada manualmente' }])
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creando categoría:', error.message);
        return;
      }

      categoryId = newCategory!.id;
      console.log('✅ Categoría "Manual Test" creada');
    } else {
      categoryId = categories[0].id;
      console.log('✅ Categoría "Manual Test" encontrada');
    }

    // 2. Intentar insertar producto usando SQL raw
    console.log('\n📦 Insertando producto con SQL raw...');
    
    const productSql = `
      INSERT INTO products (
        name, 
        sku, 
        category_id, 
        description, 
        cost_price, 
        sale_price, 
        stock_quantity, 
        min_stock
      ) VALUES (
        'Manual Test Product',
        'MTP001',
        '${categoryId}',
        'Producto insertado manualmente',
        10.00,
        20.00,
        100,
        10
      )
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id, name, sku;
    `;

    console.log('SQL a ejecutar:', productSql);

    // Usar query raw de Supabase
    const { data: productResult, error: productError } = await supabase
      .rpc('exec_sql', { sql: productSql });

    if (productError) {
      console.error('❌ Error con RPC exec_sql:', productError.message);
      
      // Intentar con query directa
      console.log('\n🔄 Intentando con query directa...');
      
      const { data: directResult, error: directError } = await supabase
        .from('products')
        .upsert([{
          name: 'Direct Test Product',
          sku: 'DTP001',
          category_id: categoryId,
          description: 'Producto insertado directamente',
          cost_price: 10.00,
          sale_price: 20.00,
          stock_quantity: 100,
          min_stock: 10
        }], { onConflict: 'sku' })
        .select('id, name, sku');

      if (directError) {
        console.error('❌ Error con inserción directa:', directError.message);
        console.error('Código:', directError.code);
        console.error('Detalles:', JSON.stringify(directError, null, 2));
      } else {
        console.log('✅ Producto insertado directamente:', directResult);
      }
    } else {
      console.log('✅ Producto insertado con SQL raw:', productResult);
    }

    // 3. Verificar productos existentes
    console.log('\n🔍 Consultando productos existentes...');
    const { data: allProducts, error: queryError } = await supabase
      .from('products')
      .select('id, name, sku, category_id')
      .eq('category_id', categoryId);

    if (queryError) {
      console.error('❌ Error consultando productos:', queryError.message);
    } else {
      console.log(`✅ Productos encontrados: ${allProducts?.length || 0}`);
      allProducts?.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku})`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createTestData();