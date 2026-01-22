import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definida' : 'No definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Definida' : 'No definida');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
  console.log('🔄 Probando conexión con Supabase...');
  
  try {
    // Test 1: Verificar conexión básica
    console.log('\n1. Verificando conexión básica...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    if (categoriesError) {
      console.error('❌ Error al obtener categorías:', categoriesError);
      return;
    }
    
    console.log('✅ Conexión exitosa');
    console.log(`📊 Categorías encontradas: ${categories?.length || 0}`);
    
    // Test 2: Verificar productos
    console.log('\n2. Verificando productos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .limit(10);
    
    if (productsError) {
      console.error('❌ Error al obtener productos:', productsError);
      return;
    }
    
    console.log('✅ Productos obtenidos exitosamente');
    console.log(`📦 Productos encontrados: ${products?.length || 0}`);
    
    if (products && products.length > 0) {
      console.log('\n📋 Muestra de productos:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
        console.log(`   Categoría: ${product.categories?.name || 'Sin categoría'}`);
        console.log(`   Precio: $${product.sale_price}`);
        console.log(`   Stock: ${product.stock_quantity}`);
        console.log('');
      });
    }
    
    // Test 3: Verificar tiempo real (suscripción)
    console.log('3. Probando suscripción en tiempo real...');
    
    const channel = supabase
      .channel('test-products')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'products' 
        }, 
        (payload) => {
          console.log('🔄 Cambio detectado en productos:', payload);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Estado de suscripción: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción en tiempo real activa');
          
          // Desconectar después de 2 segundos
          setTimeout(() => {
            supabase.removeChannel(channel);
            console.log('🔌 Suscripción desconectada');
            console.log('\n🎉 Todas las pruebas completadas exitosamente!');
            process.exit(0);
          }, 2000);
        }
      });
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testSupabaseConnection();