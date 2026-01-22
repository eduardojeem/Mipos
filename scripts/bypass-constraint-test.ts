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
  console.log('🚀 Iniciando creación de datos de prueba...');

  try {
    // 1. Crear categoría de prueba
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', 'Test Products')
      .single();

    let categoryId: string;

    if (existingCategory) {
      console.log('✅ Categoría "Test Products" ya existe');
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert([{ name: 'Test Products', description: 'Test category for products' }])
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creando categoría:', error.message);
        return;
      }

      categoryId = newCategory!.id;
      console.log('✅ Categoría "Test Products" creada exitosamente');
    }

    // 2. Intentar crear productos con diferentes formatos de SKU
    console.log('\n📦 Probando diferentes formatos de SKU...');
    
    const testProducts = [
      {
        name: 'Test Product Alpha',
        sku: 'ALPHA123',  // Solo letras y números
        category_id: categoryId,
        description: 'Test product with alphanumeric SKU',
        cost_price: 10.00,
        sale_price: 20.00,
        stock_quantity: 100,
        min_stock: 10
      },
      {
        name: 'Test Product Beta',
        sku: 'BETA456',   // Solo letras y números
        category_id: categoryId,
        description: 'Another test product',
        cost_price: 15.00,
        sale_price: 30.00,
        stock_quantity: 50,
        min_stock: 5
      },
      {
        name: 'Test Product Gamma',
        sku: 'GAMMA789',  // Solo letras y números
        category_id: categoryId,
        description: 'Third test product',
        cost_price: 25.00,
        sale_price: 50.00,
        stock_quantity: 25,
        min_stock: 3
      }
    ];

    let productsCreated = 0;

    for (const product of testProducts) {
      console.log(`\nIntentando crear: ${product.name} (SKU: ${product.sku})`);
      
      // Verificar si el producto ya existe
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('sku', product.sku)
        .single();

      if (existingProduct) {
        console.log(`✅ Producto "${product.name}" ya existe`);
        productsCreated++;
        continue;
      }

      // Intentar crear el producto
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([product])
        .select('id, name, sku')
        .single();

      if (error) {
        console.error(`❌ Error creando "${product.name}":`, error.message);
        console.error('Código:', error.code);
        
        // Si es error de regex, intentar con un SKU más simple
        if (error.code === '2201B') {
          console.log('🔄 Intentando con SKU simplificado...');
          const simplifiedProduct = {
            ...product,
            sku: `P${Date.now().toString().slice(-6)}` // SKU numérico simple
          };
          
          const { data: retryProduct, error: retryError } = await supabase
            .from('products')
            .insert([simplifiedProduct])
            .select('id, name, sku')
            .single();
            
          if (retryError) {
            console.error(`❌ Error en reintento:`, retryError.message);
          } else if (retryProduct) {
            console.log(`✅ Producto creado con SKU simplificado: ${retryProduct.sku}`);
            productsCreated++;
          }
        }
      } else if (newProduct) {
        console.log(`✅ Producto "${product.name}" creado exitosamente`);
        productsCreated++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   📁 Categorías: 1`);
    console.log(`   📦 Productos creados/existentes: ${productsCreated}`);

    // 3. Verificar productos creados
    console.log('\n🔍 Verificando productos en la base de datos...');
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