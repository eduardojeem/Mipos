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
  console.log('🚀 Iniciando creación de datos de prueba con SQL directo...');

  try {
    // 1. Crear categoría usando SQL directo
    console.log('\n📁 Creando categoría con SQL directo...');
    
    const categoryResult = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO categories (name, description) 
        VALUES ('Productos Test', 'Categoria para productos de prueba')
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name;
      `
    });

    if (categoryResult.error) {
      console.error('❌ Error creando categoría:', categoryResult.error);
      return;
    }

    console.log('✅ Resultado categoría:', categoryResult.data);

    // 2. Obtener ID de la categoría
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', 'Productos Test')
      .limit(1);

    if (!categories || categories.length === 0) {
      console.error('❌ No se pudo obtener la categoría');
      return;
    }

    const categoryId = categories[0].id;
    console.log('✅ ID de categoría obtenido:', categoryId);

    // 3. Crear productos usando SQL directo sin restricciones
    console.log('\n📦 Creando productos con SQL directo...');
    
    const productResult = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO products (name, sku, category_id, description, cost_price, sale_price, stock_quantity, min_stock) 
        VALUES 
          ('Producto Test 1', 'TEST001', '${categoryId}', 'Primer producto de prueba', 10.00, 20.00, 100, 10),
          ('Producto Test 2', 'TEST002', '${categoryId}', 'Segundo producto de prueba', 15.00, 30.00, 50, 5)
        ON CONFLICT (sku) DO NOTHING
        RETURNING id, name, sku;
      `
    });

    if (productResult.error) {
      console.error('❌ Error creando productos:', productResult.error);
    } else {
      console.log('✅ Productos creados:', productResult.data);
    }

    console.log('\n🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createTestData();