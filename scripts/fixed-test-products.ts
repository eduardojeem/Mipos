import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no encontradas');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface Product {
  name: string;
  sku: string;
  category_id: string;
  description?: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
}

// Categorías de prueba
const testCategories = [
  { name: 'Electronica', description: 'Productos electronicos' },
  { name: 'Ropa', description: 'Prendas de vestir' },
  { name: 'Hogar', description: 'Articulos para el hogar' },
  { name: 'Deportes', description: 'Articulos deportivos' }
];

// Productos de prueba con SKUs válidos (solo A-Z, 0-9, -, _)
const testProducts = [
  {
    name: 'Smartphone Samsung Galaxy',
    sku: 'PHONE-SAM-001',
    description: 'Telefono inteligente Samsung',
    cost_price: 200.00,
    sale_price: 350.00,
    stock_quantity: 15,
    min_stock: 5,
    category: 'Electronica'
  },
  {
    name: 'Laptop HP Pavilion',
    sku: 'LAPTOP-HP-002',
    description: 'Computadora portatil HP',
    cost_price: 400.00,
    sale_price: 650.00,
    stock_quantity: 8,
    min_stock: 2,
    category: 'Electronica'
  },
  {
    name: 'Camiseta Polo',
    sku: 'SHIRT-POLO-003',
    description: 'Camiseta tipo polo',
    cost_price: 15.00,
    sale_price: 25.00,
    stock_quantity: 50,
    min_stock: 10,
    category: 'Ropa'
  },
  {
    name: 'Jeans Clasicos',
    sku: 'JEANS-CLASSIC-004',
    description: 'Pantalones jeans clasicos',
    cost_price: 25.00,
    sale_price: 45.00,
    stock_quantity: 30,
    min_stock: 8,
    category: 'Ropa'
  },
  {
    name: 'Lampara LED',
    sku: 'LAMP-LED-005',
    description: 'Lampara LED para escritorio',
    cost_price: 12.00,
    sale_price: 22.00,
    stock_quantity: 25,
    min_stock: 5,
    category: 'Hogar'
  },
  {
    name: 'Pelota de Futbol',
    sku: 'BALL-SOCCER-006',
    description: 'Pelota oficial de futbol',
    cost_price: 18.00,
    sale_price: 35.00,
    stock_quantity: 20,
    min_stock: 5,
    category: 'Deportes'
  }
];

async function createTestData() {
  console.log('🚀 Iniciando creación de datos de prueba...');

  try {
    // 1. Crear categorías
    console.log('\n📁 Creando categorías...');
    const createdCategories: Category[] = [];

    for (const categoryData of testCategories) {
      // Verificar si la categoría ya existe
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id, name')
        .eq('name', categoryData.name)
        .single();

      if (existingCategory) {
        console.log(`✅ Categoría "${categoryData.name}" ya existe`);
        createdCategories.push(existingCategory);
      } else {
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert([categoryData])
          .select('id, name')
          .single();

        if (error) {
          console.error(`❌ Error creando categoría "${categoryData.name}":`, error.message);
        } else if (newCategory) {
          console.log(`✅ Categoría "${categoryData.name}" creada exitosamente`);
          createdCategories.push(newCategory);
        }
      }
    }

    // 2. Crear productos
    console.log('\n📦 Creando productos...');
    let productsCreated = 0;

    for (const productData of testProducts) {
      // Buscar la categoría correspondiente
      const category = createdCategories.find(cat => cat.name === productData.category);
      
      if (!category) {
        console.error(`❌ Categoría "${productData.category}" no encontrada para producto "${productData.name}"`);
        continue;
      }

      // Verificar si el producto ya existe
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('sku', productData.sku)
        .single();

      if (existingProduct) {
        console.log(`✅ Producto "${productData.name}" (SKU: ${productData.sku}) ya existe`);
        continue;
      }

      // Crear el producto
      const productToInsert: Product = {
        name: productData.name,
        sku: productData.sku,
        category_id: category.id,
        description: productData.description,
        cost_price: productData.cost_price,
        sale_price: productData.sale_price,
        stock_quantity: productData.stock_quantity,
        min_stock: productData.min_stock
      };

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([productToInsert])
        .select('id, name, sku')
        .single();

      if (error) {
        console.error(`❌ Error creando producto "${productData.name}":`, error.message);
        console.error('Detalles del error:', error);
      } else if (newProduct) {
        console.log(`✅ Producto "${productData.name}" (SKU: ${productData.sku}) creado exitosamente`);
        productsCreated++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   📁 Categorías procesadas: ${createdCategories.length}`);
    console.log(`   📦 Productos creados: ${productsCreated}`);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
createTestData();