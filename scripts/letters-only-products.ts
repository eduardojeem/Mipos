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

async function createLettersOnlyProducts() {
  console.log('🚀 Iniciando creación de productos con SKUs solo de letras...');

  try {
    // 1. Crear o obtener categoría
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Solo Letras')
      .single();

    let categoryId: string;

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('✅ Categoría existente encontrada');
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Solo Letras', 
          description: 'Productos con SKU solo de letras mayúsculas' 
        }])
        .select('id')
        .single();

      if (catError) {
        console.error('❌ Error creando categoría:', catError.message);
        return;
      }

      categoryId = newCategory!.id;
      console.log('✅ Categoría creada exitosamente');
    }

    // 2. Crear productos con SKUs solo de letras
    console.log('\n📦 Creando productos con SKUs solo de letras...');
    
    const products = [
      {
        name: 'Producto Alpha',
        description: 'Primer producto de prueba',
        sku: 'ALPHA',
        cost_price: 10.00,
        sale_price: 15.00,
        stock_quantity: 100,
        min_stock: 10,
        category_id: categoryId
      },
      {
        name: 'Producto Beta',
        description: 'Segundo producto de prueba',
        sku: 'BETA',
        cost_price: 20.00,
        sale_price: 30.00,
        stock_quantity: 50,
        min_stock: 5,
        category_id: categoryId
      },
      {
        name: 'Producto Gamma',
        description: 'Tercer producto de prueba',
        sku: 'GAMMA',
        cost_price: 30.00,
        sale_price: 45.00,
        stock_quantity: 25,
        min_stock: 3,
        category_id: categoryId
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        console.log(`\n🔄 Creando "${product.name}" con SKU: ${product.sku}`);

        const { data, error } = await supabase
          .from('products')
          .insert([product])
          .select('id, name, sku');

        if (error) {
          console.error(`   ❌ Error creando ${product.name}:`, error.message);
          console.error(`   Código: ${error.code}`);
          if (error.details) console.error(`   Detalles: ${error.details}`);
          if (error.hint) console.error(`   Sugerencia: ${error.hint}`);
          errorCount++;
        } else {
          console.log(`   ✅ ${product.name} creado exitosamente`);
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Excepción creando ${product.name}:`, err);
        errorCount++;
      }
    }

    // 3. Si fallan las letras, intentar con un solo carácter
    if (successCount === 0) {
      console.log('\n🔄 Intentando con SKUs de un solo carácter...');
      
      const singleCharProducts = [
        {
          name: 'Producto A',
          description: 'Producto con SKU de una letra',
          sku: 'A',
          cost_price: 5.00,
          sale_price: 8.00,
          stock_quantity: 10,
          min_stock: 1,
          category_id: categoryId
        }
      ];

      for (const product of singleCharProducts) {
        try {
          console.log(`\n🔄 Creando "${product.name}" con SKU: ${product.sku}`);

          const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select('id, name, sku');

          if (error) {
            console.error(`   ❌ Error creando ${product.name}:`, error.message);
            console.error(`   Código: ${error.code}`);
            if (error.details) console.error(`   Detalles: ${error.details}`);
            if (error.hint) console.error(`   Sugerencia: ${error.hint}`);
          } else {
            console.log(`   ✅ ${product.name} creado exitosamente`);
            successCount++;
          }
        } catch (err) {
          console.error(`   ❌ Excepción creando ${product.name}:`, err);
        }
      }
    }

    // 4. Verificar productos creados
    console.log('\n🔍 Verificando productos creados...');
    
    const { data: allProducts, error: queryError } = await supabase
      .from('products')
      .select('id, name, sku, cost_price, sale_price, stock_quantity')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('❌ Error consultando productos:', queryError.message);
    } else {
      console.log(`\n📊 Resumen:`);
      console.log(`   ✅ Productos creados exitosamente: ${successCount}`);
      console.log(`   ❌ Errores: ${errorCount}`);
      console.log(`   📦 Total en base de datos: ${allProducts?.length || 0}`);
      
      if (allProducts && allProducts.length > 0) {
        console.log('\n📋 Productos en la base de datos:');
        allProducts.forEach(product => {
          console.log(`   - ${product.name} (SKU: ${product.sku})`);
        });
      }
    }

    if (successCount === 0) {
      console.log('\n💡 Sugerencias para resolver el problema:');
      console.log('   1. El constraint de regex en la base de datos tiene un error de sintaxis');
      console.log('   2. Necesitamos acceso directo a la base de datos para corregir el constraint');
      console.log('   3. Considera contactar al administrador de la base de datos');
      console.log('   4. Como alternativa temporal, se podría deshabilitar el constraint');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createLettersOnlyProducts();