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

// Función para generar SKU simple que funciona
function generateSimpleSku(prefix: string, number: number): string {
  return `${prefix}${number.toString().padStart(3, '0')}`;
}

async function createComprehensiveProducts() {
  console.log('🚀 Creando conjunto completo de productos de prueba...');
  console.log('📋 Usando SKUs simples que funcionan correctamente\n');

  try {
    // 1. Definir categorías
    const categories = [
      {
        name: 'Electrónicos',
        description: 'Dispositivos electrónicos y gadgets',
        products: [
          {
            name: 'Laptop Dell Inspiron 15',
            description: 'Laptop Dell Inspiron 15 con procesador Intel i5, 8GB RAM, 256GB SSD',
            cost_price: 450.00,
            sale_price: 699.99,
            stock_quantity: 12,
            min_stock: 3
          },
          {
            name: 'iPhone 14 Pro',
            description: 'iPhone 14 Pro 128GB, pantalla ProMotion, cámara triple',
            cost_price: 800.00,
            sale_price: 1199.99,
            stock_quantity: 8,
            min_stock: 2
          },
          {
            name: 'Samsung Galaxy S23',
            description: 'Samsung Galaxy S23 256GB, cámara de 50MP, pantalla AMOLED',
            cost_price: 600.00,
            sale_price: 899.99,
            stock_quantity: 15,
            min_stock: 4
          },
          {
            name: 'iPad Air',
            description: 'iPad Air 64GB WiFi, pantalla Liquid Retina de 10.9 pulgadas',
            cost_price: 400.00,
            sale_price: 599.99,
            stock_quantity: 10,
            min_stock: 3
          },
          {
            name: 'AirPods Pro',
            description: 'AirPods Pro con cancelación activa de ruido y estuche MagSafe',
            cost_price: 150.00,
            sale_price: 249.99,
            stock_quantity: 25,
            min_stock: 8
          }
        ]
      },
      {
        name: 'Accesorios',
        description: 'Accesorios para computadoras y dispositivos móviles',
        products: [
          {
            name: 'Mouse Logitech MX Master 3',
            description: 'Mouse inalámbrico ergonómico con scroll electromagnético',
            cost_price: 60.00,
            sale_price: 99.99,
            stock_quantity: 30,
            min_stock: 10
          },
          {
            name: 'Teclado Mecánico Corsair K95',
            description: 'Teclado mecánico RGB con switches Cherry MX, retroiluminación',
            cost_price: 120.00,
            sale_price: 179.99,
            stock_quantity: 18,
            min_stock: 5
          },
          {
            name: 'Monitor LG 27 4K',
            description: 'Monitor LG 27 pulgadas 4K UHD, IPS, HDR10',
            cost_price: 250.00,
            sale_price: 399.99,
            stock_quantity: 8,
            min_stock: 2
          },
          {
            name: 'Webcam Logitech C920',
            description: 'Webcam Full HD 1080p con micrófono estéreo integrado',
            cost_price: 45.00,
            sale_price: 79.99,
            stock_quantity: 22,
            min_stock: 6
          },
          {
            name: 'Cargador Inalámbrico Anker',
            description: 'Cargador inalámbrico rápido 15W compatible con iPhone y Android',
            cost_price: 20.00,
            sale_price: 34.99,
            stock_quantity: 40,
            min_stock: 12
          }
        ]
      },
      {
        name: 'Gaming',
        description: 'Productos para gaming y entretenimiento',
        products: [
          {
            name: 'PlayStation 5',
            description: 'Consola PlayStation 5 con lector de discos, 825GB SSD',
            cost_price: 400.00,
            sale_price: 599.99,
            stock_quantity: 5,
            min_stock: 1
          },
          {
            name: 'Xbox Series X',
            description: 'Consola Xbox Series X 1TB, 4K gaming, Quick Resume',
            cost_price: 380.00,
            sale_price: 569.99,
            stock_quantity: 6,
            min_stock: 1
          },
          {
            name: 'Nintendo Switch OLED',
            description: 'Nintendo Switch modelo OLED con pantalla de 7 pulgadas',
            cost_price: 250.00,
            sale_price: 349.99,
            stock_quantity: 12,
            min_stock: 3
          },
          {
            name: 'Auriculares Gaming SteelSeries',
            description: 'Auriculares gaming con micrófono retráctil y sonido 7.1',
            cost_price: 80.00,
            sale_price: 129.99,
            stock_quantity: 20,
            min_stock: 6
          },
          {
            name: 'Silla Gaming DXRacer',
            description: 'Silla gaming ergonómica con soporte lumbar y reposabrazos ajustables',
            cost_price: 200.00,
            sale_price: 299.99,
            stock_quantity: 8,
            min_stock: 2
          }
        ]
      },
      {
        name: 'Oficina',
        description: 'Productos para oficina y trabajo remoto',
        products: [
          {
            name: 'Impresora HP LaserJet',
            description: 'Impresora láser monocromática HP LaserJet Pro, WiFi',
            cost_price: 120.00,
            sale_price: 189.99,
            stock_quantity: 10,
            min_stock: 3
          },
          {
            name: 'Escáner Epson Perfection',
            description: 'Escáner de documentos Epson con resolución 4800 DPI',
            cost_price: 80.00,
            sale_price: 129.99,
            stock_quantity: 8,
            min_stock: 2
          },
          {
            name: 'Lámpara LED de Escritorio',
            description: 'Lámpara LED ajustable con carga inalámbrica integrada',
            cost_price: 35.00,
            sale_price: 59.99,
            stock_quantity: 25,
            min_stock: 8
          },
          {
            name: 'Organizador de Cables',
            description: 'Sistema de organización de cables para escritorio',
            cost_price: 15.00,
            sale_price: 24.99,
            stock_quantity: 50,
            min_stock: 15
          },
          {
            name: 'Soporte para Laptop',
            description: 'Soporte ajustable de aluminio para laptop, ergonómico',
            cost_price: 25.00,
            sale_price: 39.99,
            stock_quantity: 30,
            min_stock: 10
          }
        ]
      }
    ];

    let totalSuccess = 0;
    let totalErrors = 0;

    // 2. Crear categorías y productos
    for (let catIndex = 0; catIndex < categories.length; catIndex++) {
      const categoryData = categories[catIndex];
      
      console.log(`\n📁 Procesando categoría: ${categoryData.name}`);
      
      // Crear o obtener categoría
      const { data: category, error: catError } = await supabase
        .from('categories')
        .upsert([{ 
          name: categoryData.name, 
          description: categoryData.description 
        }], { onConflict: 'name' })
        .select('id')
        .single();

      if (catError) {
        console.error(`❌ Error creando categoría ${categoryData.name}:`, catError.message);
        continue;
      }

      console.log(`✅ Categoría ${categoryData.name} lista`);

      // Crear productos de la categoría
      for (let prodIndex = 0; prodIndex < categoryData.products.length; prodIndex++) {
        const productTemplate = categoryData.products[prodIndex];
        
        // Generar SKU simple usando el índice de categoría y producto
        const sku = generateSimpleSku(
          categoryData.name.charAt(0).toUpperCase(), // Primera letra de la categoría
          (catIndex * 100) + (prodIndex + 1) // Número único
        );

        const product = {
          ...productTemplate,
          sku: sku,
          category_id: category.id
        };

        try {
          const { data, error } = await supabase
            .from('products')
            .insert([product])
            .select('id, name, sku');

          if (error) {
            console.error(`   ❌ Error creando ${product.name}:`, error.message);
            totalErrors++;
          } else {
            console.log(`   ✅ ${product.name} (SKU: ${sku})`);
            totalSuccess++;
          }
        } catch (err) {
          console.error(`   ❌ Excepción creando ${product.name}:`, err);
          totalErrors++;
        }
      }
    }

    // 3. Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`✅ Productos creados exitosamente: ${totalSuccess}`);
    console.log(`❌ Errores: ${totalErrors}`);
    console.log(`📦 Total de categorías: ${categories.length}`);
    
    if (totalSuccess > 0) {
      console.log('\n🎉 ¡Base de datos poblada exitosamente!');
      console.log('📋 Productos disponibles por categoría:');
      
      // Verificar productos por categoría
      for (const categoryData of categories) {
        const { data: products } = await supabase
          .from('products')
          .select('name, sku, sale_price, stock_quantity')
          .eq('category_id', (await supabase
            .from('categories')
            .select('id')
            .eq('name', categoryData.name)
            .single()).data?.id);

        if (products && products.length > 0) {
          console.log(`\n   📁 ${categoryData.name} (${products.length} productos):`);
          products.forEach(p => {
            console.log(`      • ${p.name} - $${p.sale_price} (Stock: ${p.stock_quantity})`);
          });
        }
      }

      console.log('\n🌟 ¡Ahora puedes probar todas las funcionalidades del dashboard!');
      console.log('   • Gestión de inventario');
      console.log('   • Reportes de productos');
      console.log('   • Alertas de stock bajo');
      console.log('   • Categorización de productos');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createComprehensiveProducts();