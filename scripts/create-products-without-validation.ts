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

// Crear cliente con configuración especial para bypass
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
});

async function createProductsWithoutValidation() {
  console.log('🚀 Intentando crear productos sin validación...');
  console.log('📋 Información del problema:');
  console.log('   - Error: "invalid regular expression: invalid character range"');
  console.log('   - Código: 2201B (PostgreSQL regex error)');
  console.log('   - Causa: Constraint products_sku_format con regex malformado');
  console.log('');

  try {
    // 1. Crear categoría primero
    console.log('📁 Creando categoría de prueba...');
    
    const { data: category, error: catError } = await supabase
      .from('categories')
      .upsert([{ 
        name: 'Productos Manuales', 
        description: 'Productos creados manualmente para pruebas' 
      }], { onConflict: 'name' })
      .select('id')
      .single();

    if (catError) {
      console.error('❌ Error creando categoría:', catError.message);
      return;
    }

    console.log('✅ Categoría creada/encontrada exitosamente');

    // 2. Intentar diferentes enfoques para crear productos
    console.log('\n📦 Intentando diferentes enfoques...');

    // Enfoque 1: Producto con SKU muy simple
    console.log('\n🔄 Enfoque 1: SKU ultra simple (solo números)');
    await attemptProductCreation({
      name: 'Producto Simple',
      description: 'Producto con SKU numérico',
      sku: '123',
      cost_price: 10.00,
      sale_price: 15.00,
      stock_quantity: 100,
      min_stock: 10,
      category_id: category.id
    });

    // Enfoque 2: Producto con SKU de una letra
    console.log('\n🔄 Enfoque 2: SKU de una sola letra');
    await attemptProductCreation({
      name: 'Producto Letra',
      description: 'Producto con SKU de una letra',
      sku: 'A',
      cost_price: 10.00,
      sale_price: 15.00,
      stock_quantity: 100,
      min_stock: 10,
      category_id: category.id
    });

    // Enfoque 3: Intentar con diferentes configuraciones de cliente
    console.log('\n🔄 Enfoque 3: Cliente con configuración alternativa');
    
    const altClient = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    });

    const { data: altProduct, error: altError } = await altClient
      .from('products')
      .insert([{
        name: 'Producto Alternativo',
        description: 'Producto con cliente alternativo',
        sku: 'ALT',
        cost_price: 10.00,
        sale_price: 15.00,
        stock_quantity: 100,
        min_stock: 10,
        category_id: category.id
      }])
      .select('id, name, sku');

    if (altError) {
      console.error('❌ Error con cliente alternativo:', altError.message);
    } else {
      console.log('✅ ¡Producto creado con cliente alternativo!');
    }

    // 4. Mostrar resumen y recomendaciones
    console.log('\n📊 RESUMEN DEL PROBLEMA:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNÓSTICO:');
    console.log('   • El constraint "products_sku_format" tiene un regex malformado');
    console.log('   • Error PostgreSQL 2201B indica "invalid character range"');
    console.log('   • Probablemente el regex es algo como "^[A-Z0-9-_]+$" (incorrecto)');
    console.log('   • Debería ser "^[A-Z0-9_-]+$" o "^[A-Z0-9\\-_]+$" (correcto)');
    console.log('');
    console.log('🛠️ SOLUCIONES POSIBLES:');
    console.log('   1. Acceso directo a PostgreSQL para corregir el constraint');
    console.log('   2. Usar Supabase Dashboard para modificar la tabla');
    console.log('   3. Crear una migración SQL para corregir el regex');
    console.log('   4. Contactar al administrador de la base de datos');
    console.log('');
    console.log('📝 COMANDO SQL PARA CORREGIR:');
    console.log('   ALTER TABLE products DROP CONSTRAINT products_sku_format;');
    console.log('   ALTER TABLE products ADD CONSTRAINT products_sku_format');
    console.log('   CHECK (sku ~ \'^[A-Z0-9_-]+$\');');
    console.log('');
    console.log('🌐 ALTERNATIVA TEMPORAL:');
    console.log('   • Crear productos directamente desde Supabase Dashboard');
    console.log('   • Usar la interfaz web para bypass del constraint');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

async function attemptProductCreation(product: any) {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select('id, name, sku');

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      if (error.code) console.error(`   Código: ${error.code}`);
    } else {
      console.log(`   ✅ ¡Éxito! Producto creado: ${product.name} (SKU: ${product.sku})`);
      return true;
    }
  } catch (err) {
    console.error(`   ❌ Excepción:`, err);
  }
  return false;
}

// Ejecutar el script
createProductsWithoutValidation();