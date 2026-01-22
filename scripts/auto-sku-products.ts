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

// Función para generar SKU único
function generateSku(): string {
  // Usar timestamp + número aleatorio para generar SKU único
  const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos del timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `P${timestamp}${random}`;
}

async function createProductsWithAutoSku() {
  console.log('🚀 Iniciando creación de productos con SKU automático...');

  try {
    // 1. Crear o obtener categoría
    console.log('\n📁 Creando categoría...');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Auto SKU')
      .single();

    let categoryId: string;

    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('✅ Categoría existente encontrada');
    } else {
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert([{ 
          name: 'Auto SKU', 
          description: 'Productos con SKU generado automáticamente' 
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

    // 2. Crear productos con SKUs generados automáticamente
    console.log('\n📦 Creando productos con SKUs automáticos...');
    
    const productTemplates = [
      {
        name: 'Laptop Gaming',
        description: 'Laptop para gaming de alta gama',
        cost_price: 800.00,
        sale_price: 1200.00,
        stock_quantity: 15,
        min_stock: 3
      },
      {
        name: 'Mouse Inalámbrico',
        description: 'Mouse inalámbrico ergonómico',
        cost_price: 25.00,
        sale_price: 45.00,
        stock_quantity: 50,
        min_stock: 10
      },
      {
        name: 'Teclado Mecánico',
        description: 'Teclado mecánico RGB',
        cost_price: 60.00,
        sale_price: 95.00,
        stock_quantity: 30,
        min_stock: 5
      },
      {
        name: 'Monitor 24 pulgadas',
        description: 'Monitor Full HD 24 pulgadas',
        cost_price: 150.00,
        sale_price: 220.00,
        stock_quantity: 20,
        min_stock: 4
      },
      {
        name: 'Auriculares Bluetooth',
        description: 'Auriculares inalámbricos con cancelación de ruido',
        cost_price: 80.00,
        sale_price: 130.00,
        stock_quantity: 25,
        min_stock: 5
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const template of productTemplates) {
      // Generar SKU único para cada producto
      let sku = generateSku();
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const product = {
            ...template,
            sku: sku,
            category_id: categoryId
          };

          console.log(`\n🔄 Intentando crear "${template.name}" con SKU: ${sku}`);

          const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select('id, name, sku');

          if (error) {
            if (error.code === '23505') { // Duplicate key error
              console.log(`   ⚠️ SKU ${sku} ya existe, generando nuevo...`);
              sku = generateSku();
              attempts++;
              continue;
            } else {
              console.error(`   ❌ Error creando ${template.name}:`, error.message);
              console.error(`   Código: ${error.code}`);
              if (error.details) console.error(`   Detalles: ${error.details}`);
              errorCount++;
              break;
            }
          } else {
            console.log(`   ✅ ${template.name} creado exitosamente (SKU: ${sku})`);
            successCount++;
            break;
          }
        } catch (err) {
          console.error(`   ❌ Excepción creando ${template.name}:`, err);
          errorCount++;
          break;
        }
      }

      if (attempts >= maxAttempts) {
        console.error(`   ❌ No se pudo crear ${template.name} después de ${maxAttempts} intentos`);
        errorCount++;
      }
    }

    // 3. Verificar productos creados
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
          console.log(`   - ${product.name}`);
          console.log(`     SKU: ${product.sku}`);
          console.log(`     Precio: $${product.cost_price} → $${product.sale_price}`);
          console.log(`     Stock: ${product.stock_quantity} unidades`);
          console.log('');
        });
      }
    }

    if (successCount > 0) {
      console.log('🎉 ¡Productos creados exitosamente! Ahora puedes probar la funcionalidad del dashboard.');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createProductsWithAutoSku();