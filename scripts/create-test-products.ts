#!/usr/bin/env tsx

/**
 * Script para crear productos de prueba en Supabase
 * 
 * Este script crea categorías y productos de prueba para el sistema POS
 * Incluye productos de diferentes categorías con datos realistas
 * 
 * Uso:
 * npm run tsx scripts/create-test-products.ts
 * 
 * O desde la raíz del proyecto:
 * npx tsx scripts/create-test-products.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Cargar variables de entorno
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de categorías de prueba
const testCategories = [
  {
    name: 'Electrónicos',
    description: 'Dispositivos electrónicos y tecnología'
  },
  {
    name: 'Ropa y Accesorios',
    description: 'Vestimenta y complementos de moda'
  },
  {
    name: 'Hogar y Jardín',
    description: 'Artículos para el hogar y jardinería'
  },
  {
    name: 'Deportes y Fitness',
    description: 'Equipamiento deportivo y fitness'
  },
  {
    name: 'Libros y Papelería',
    description: 'Libros, material de oficina y papelería'
  },
  {
    name: 'Salud y Belleza',
    description: 'Productos de cuidado personal y belleza'
  },
  {
    name: 'Alimentación',
    description: 'Productos alimenticios y bebidas'
  },
  {
    name: 'Juguetes y Juegos',
    description: 'Juguetes y entretenimiento para todas las edades'
  }
];

// Función para generar SKU único
const generateSKU = (categoryName: string, index: number): string => {
  const categoryCode = categoryName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${categoryCode}-${String(index).padStart(3, '0')}-${timestamp}`;
};

// Datos de productos de prueba por categoría
const getTestProducts = (categoryId: string, categoryName: string) => {
  const productsByCategory: Record<string, any[]> = {
    'Electrónicos': [
      {
        name: 'Laptop Dell XPS 13',
        description: 'Laptop ultrabook con procesador Intel i7, 16GB RAM, 512GB SSD',
        costPrice: 800.00,
        salePrice: 1200.00,
        stockQuantity: 15,
        minStock: 5,
        images: []
      },
      {
        name: 'iPhone 15 Pro',
        description: 'Smartphone Apple con chip A17 Pro, 128GB',
        costPrice: 900.00,
        salePrice: 1299.00,
        stockQuantity: 8,
        minStock: 3,
        images: []
      },
      {
        name: 'Mouse Logitech MX Master 3',
        description: 'Mouse inalámbrico ergonómico para productividad',
        costPrice: 50.00,
        salePrice: 89.99,
        stockQuantity: 25,
        minStock: 10,
        images: []
      },
      {
        name: 'Monitor Samsung 27" 4K',
        description: 'Monitor 4K UHD de 27 pulgadas con HDR',
        costPrice: 250.00,
        salePrice: 399.99,
        stockQuantity: 12,
        minStock: 5,
        images: []
      },
      {
        name: 'Teclado Mecánico Corsair',
        description: 'Teclado mecánico RGB con switches Cherry MX',
        costPrice: 80.00,
        salePrice: 129.99,
        stockQuantity: 18,
        minStock: 8,
        images: []
      }
    ],
    'Ropa y Accesorios': [
      {
        name: 'Camiseta Nike Dri-FIT',
        description: 'Camiseta deportiva de secado rápido',
        costPrice: 15.00,
        salePrice: 29.99,
        stockQuantity: 50,
        minStock: 20,
        images: []
      },
      {
        name: 'Jeans Levis 501',
        description: 'Jeans clásicos de corte recto',
        costPrice: 35.00,
        salePrice: 69.99,
        stockQuantity: 30,
        minStock: 15,
        images: []
      },
      {
        name: 'Zapatillas Adidas Ultraboost',
        description: 'Zapatillas de running con tecnología Boost',
        costPrice: 90.00,
        salePrice: 159.99,
        stockQuantity: 20,
        minStock: 8,
        images: []
      },
      {
        name: 'Reloj Casio G-Shock',
        description: 'Reloj deportivo resistente al agua',
        costPrice: 60.00,
        salePrice: 99.99,
        stockQuantity: 15,
        minStock: 5,
        images: []
      }
    ],
    'Hogar y Jardín': [
      {
        name: 'Silla Ergonómica de Oficina',
        description: 'Silla de oficina con soporte lumbar ajustable',
        costPrice: 120.00,
        salePrice: 199.99,
        stockQuantity: 10,
        minStock: 3,
        images: []
      },
      {
        name: 'Lámpara LED de Escritorio',
        description: 'Lámpara LED regulable con carga USB',
        costPrice: 25.00,
        salePrice: 49.99,
        stockQuantity: 35,
        minStock: 15,
        images: []
      },
      {
        name: 'Aspiradora Robot Roomba',
        description: 'Aspiradora robótica con mapeo inteligente',
        costPrice: 200.00,
        salePrice: 349.99,
        stockQuantity: 8,
        minStock: 3,
        images: []
      },
      {
        name: 'Set de Herramientas 50 piezas',
        description: 'Kit completo de herramientas para el hogar',
        costPrice: 40.00,
        salePrice: 79.99,
        stockQuantity: 22,
        minStock: 10,
        images: []
      }
    ],
    'Deportes y Fitness': [
      {
        name: 'Mancuernas Ajustables 20kg',
        description: 'Set de mancuernas ajustables hasta 20kg cada una',
        costPrice: 80.00,
        salePrice: 149.99,
        stockQuantity: 12,
        minStock: 5,
        images: []
      },
      {
        name: 'Esterilla de Yoga Premium',
        description: 'Esterilla antideslizante de 6mm de grosor',
        costPrice: 20.00,
        salePrice: 39.99,
        stockQuantity: 40,
        minStock: 20,
        images: []
      },
      {
        name: 'Bicicleta Estática Plegable',
        description: 'Bicicleta estática con resistencia magnética',
        costPrice: 150.00,
        salePrice: 279.99,
        stockQuantity: 6,
        minStock: 2,
        images: []
      }
    ],
    'Libros y Papelería': [
      {
        name: 'Cuaderno Moleskine A5',
        description: 'Cuaderno de tapa dura con hojas punteadas',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 60,
        minStock: 30,
        images: []
      },
      {
        name: 'Set de Bolígrafos Pilot',
        description: 'Pack de 12 bolígrafos de gel de colores',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 45,
        minStock: 25,
        images: []
      },
      {
        name: 'Calculadora Cientifica Casio',
        description: 'Calculadora científica con 417 funciones',
        costPrice: 25.00,
        salePrice: 45.99,
        stockQuantity: 28,
        minStock: 15,
        images: []
      }
    ],
    'Salud y Belleza': [
      {
        name: 'Crema Hidratante Facial',
        description: 'Crema hidratante con ácido hialurónico',
        costPrice: 15.00,
        salePrice: 29.99,
        stockQuantity: 35,
        minStock: 20,
        images: []
      },
      {
        name: 'Cepillo Electrico Oral-B',
        description: 'Cepillo de dientes eléctrico recargable',
        costPrice: 45.00,
        salePrice: 79.99,
        stockQuantity: 18,
        minStock: 8,
        images: []
      },
      {
        name: 'Vitaminas Multivitaminico',
        description: 'Suplemento multivitamínico 60 cápsulas',
        costPrice: 12.00,
        salePrice: 24.99,
        stockQuantity: 50,
        minStock: 25,
        images: []
      }
    ],
    'Alimentación': [
      {
        name: 'Cafe Premium Arabica 500g',
        description: 'Café en grano 100% arábica tostado medio',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 80,
        minStock: 40,
        images: []
      },
      {
        name: 'Aceite de Oliva Extra Virgen',
        description: 'Aceite de oliva extra virgen 500ml',
        costPrice: 6.00,
        salePrice: 12.99,
        stockQuantity: 65,
        minStock: 30,
        images: []
      },
      {
        name: 'Miel Organica 250g',
        description: 'Miel pura orgánica de flores silvestres',
        costPrice: 5.00,
        salePrice: 11.99,
        stockQuantity: 45,
        minStock: 25,
        images: []
      }
    ],
    'Juguetes y Juegos': [
      {
        name: 'LEGO Creator 3 en 1',
        description: 'Set de construcción LEGO con 3 modelos diferentes',
        costPrice: 30.00,
        salePrice: 59.99,
        stockQuantity: 25,
        minStock: 10,
        images: []
      },
      {
        name: 'Puzzle 1000 piezas',
        description: 'Puzzle de paisaje natural de 1000 piezas',
        costPrice: 8.00,
        salePrice: 16.99,
        stockQuantity: 40,
        minStock: 20,
        images: []
      },
      {
        name: 'Juego de Mesa Monopoly',
        description: 'Clásico juego de mesa Monopoly edición estándar',
        costPrice: 20.00,
        salePrice: 39.99,
        stockQuantity: 15,
        minStock: 8,
        images: []
      }
    ]
  };

  const products = productsByCategory[categoryName] || [];
  return products.map((product, index) => ({
    ...product,
    sku: generateSKU(categoryName, index + 1),
    categoryId: categoryId
  }));
};

// Función principal
async function createTestProducts() {
  console.log('🚀 Iniciando creación de productos de prueba...\n');

  try {
    // 1. Crear categorías
    console.log('📁 Creando categorías...');
    const createdCategories = [];

    for (const category of testCategories) {
      // Verificar si la categoría ya existe
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id, name')
        .eq('name', category.name)
        .single();

      if (existingCategory) {
        console.log(`   ✓ Categoría "${category.name}" ya existe`);
        createdCategories.push(existingCategory);
      } else {
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert([category])
          .select()
          .single();

        if (error) {
          console.error(`   ❌ Error creando categoría "${category.name}":`, error.message);
          continue;
        }

        console.log(`   ✓ Categoría "${category.name}" creada`);
        createdCategories.push(newCategory);
      }
    }

    console.log(`\n📦 Creando productos para ${createdCategories.length} categorías...\n`);

    // 2. Crear productos para cada categoría
    let totalProductsCreated = 0;
    let totalProductsSkipped = 0;

    for (const category of createdCategories) {
      console.log(`📂 Procesando categoría: ${category.name}`);
      const products = getTestProducts(category.id, category.name);

      for (const product of products) {
        // Verificar si el producto ya existe por SKU
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, name, sku')
          .eq('sku', product.sku)
          .single();

        if (existingProduct) {
          console.log(`   ⚠️  Producto "${product.name}" (${product.sku}) ya existe`);
          totalProductsSkipped++;
          continue;
        }

        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            sku: product.sku,
            category_id: product.categoryId,
            description: product.description,
            cost_price: product.costPrice,
            sale_price: product.salePrice,
            stock_quantity: product.stockQuantity,
            min_stock: product.minStock,
            images: product.images
          }])
          .select()
          .single();

        if (error) {
          console.error(`   ❌ Error creando producto "${product.name}":`, error.message);
          continue;
        }

        console.log(`   ✓ Producto "${product.name}" creado (Stock: ${product.stockQuantity})`);
        totalProductsCreated++;
      }
    }

    // 3. Mostrar resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE CREACIÓN DE PRODUCTOS DE PRUEBA');
    console.log('='.repeat(60));
    console.log(`✅ Categorías procesadas: ${createdCategories.length}`);
    console.log(`✅ Productos creados: ${totalProductsCreated}`);
    console.log(`⚠️  Productos omitidos (ya existían): ${totalProductsSkipped}`);
    console.log(`📦 Total de productos en el sistema: ${totalProductsCreated + totalProductsSkipped}`);

    // 4. Verificar datos creados
    const { data: totalProducts, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (!countError) {
      console.log(`🔍 Verificación: ${totalProducts?.length || 0} productos en la base de datos`);
    }

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('\n💡 Puedes verificar los productos en:');
    console.log('   - Dashboard de productos: http://localhost:3000/dashboard/products');
    console.log('   - Supabase Dashboard: https://app.supabase.com');

  } catch (error) {
    console.error('\n❌ Error general:', error);
    process.exit(1);
  }
}

// Ejecutar el script
if (require.main === module) {
  createTestProducts()
    .then(() => {
      console.log('\n✨ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

export { createTestProducts };