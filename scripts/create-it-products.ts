import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createITProducts() {
  console.log('🚀 Creando productos para Casa de Informática...');
  console.log(`📍 URL: ${supabaseUrl}`);

  // 1. Crear Categorías
  const categories = [
    { name: 'Computadoras', description: 'Notebooks, Desktops, All-in-One' },
    { name: 'Componentes', description: 'Procesadores, RAM, Discos, Placas de Video' },
    { name: 'Periféricos', description: 'Teclados, Mouse, Monitores, Impresoras' },
    { name: 'Redes', description: 'Routers, Cables, Adaptadores' },
    { name: 'Almacenamiento', description: 'Pendrives, Discos Externos' }
  ];

  console.log('\n📂 Procesando Categorías...');
  const { data: cats, error: catError } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'name' })
    .select();

  if (catError) {
    console.error('❌ Error creando categorías:', catError.message);
    return;
  }
  console.log(`✅ ${cats.length} categorías listas`);

  const getCatId = (name: string) => cats.find(c => c.name === name)?.id;

  // 2. Crear Productos
  // Usamos SKUs simples numéricos para evitar problemas con el regex roto si es posible
  // O intentamos SKUs alfanuméricos simples si el regex es por ejemplo [A-Z0-9]
  // Quitamos la columna 'brand' que no existe en el schema actual de Supabase
  
  const products = [
    {
      name: 'Notebook Lenovo V15',
      sku: 'NTB001',
      description: 'AMD Ryzen 5 5500U, 8GB RAM, 256GB SSD, 15.6" FHD - Marca: Lenovo',
      cost_price: 450.00,
      sale_price: 650.00,
      stock_quantity: 10,
      min_stock: 2,
      category_id: getCatId('Computadoras')
    },
    {
      name: 'Notebook HP 240 G8',
      sku: 'NTB002',
      description: 'Intel Core i3 1005G1, 8GB RAM, 240GB SSD, 14" HD - Marca: HP',
      cost_price: 400.00,
      sale_price: 580.00,
      stock_quantity: 8,
      min_stock: 2,
      category_id: getCatId('Computadoras')
    },
    {
      name: 'Monitor Samsung 24" T350',
      sku: 'MON001',
      description: 'Panel IPS, 75Hz, Full HD, Borderless - Marca: Samsung',
      cost_price: 120.00,
      sale_price: 180.00,
      stock_quantity: 15,
      min_stock: 3,
      category_id: getCatId('Periféricos')
    },
    {
      name: 'Teclado Redragon Kumara K552',
      sku: 'PER001',
      description: 'Mecánico, Switch Blue, RGB, Español - Marca: Redragon',
      cost_price: 35.00,
      sale_price: 55.00,
      stock_quantity: 20,
      min_stock: 5,
      category_id: getCatId('Periféricos')
    },
    {
      name: 'Mouse Logitech G203',
      sku: 'PER002',
      description: 'Lightsync RGB, 8000 DPI, 6 botones - Marca: Logitech',
      cost_price: 20.00,
      sale_price: 35.00,
      stock_quantity: 25,
      min_stock: 5,
      category_id: getCatId('Periféricos')
    },
    {
      name: 'Impresora Epson L3250',
      sku: 'IMP001',
      description: 'Multifunción, Sistema Continuo, Wifi - Marca: Epson',
      cost_price: 180.00,
      sale_price: 250.00,
      stock_quantity: 5,
      min_stock: 1,
      category_id: getCatId('Periféricos')
    },
    {
      name: 'Router TP-Link Archer C6',
      sku: 'NET001',
      description: 'Gigabit, Dual Band AC1200, MU-MIMO - Marca: TP-Link',
      cost_price: 40.00,
      sale_price: 65.00,
      stock_quantity: 12,
      min_stock: 3,
      category_id: getCatId('Redes')
    },
    {
      name: 'SSD Kingston A400 480GB',
      sku: 'COM001',
      description: 'SATA III, 2.5", 500MB/s lectura - Marca: Kingston',
      cost_price: 30.00,
      sale_price: 50.00,
      stock_quantity: 30,
      min_stock: 5,
      category_id: getCatId('Componentes')
    },
    {
      name: 'Memoria RAM Fury Beast 8GB',
      sku: 'COM002',
      description: 'DDR4, 3200MHz, CL16, Disipador negro - Marca: Kingston',
      cost_price: 25.00,
      sale_price: 45.00,
      stock_quantity: 40,
      min_stock: 5,
      category_id: getCatId('Componentes')
    },
    {
      name: 'Pendrive SanDisk Cruzer 64GB',
      sku: 'STO001',
      description: 'USB 2.0, Diseño compacto, Negro - Marca: SanDisk',
      cost_price: 5.00,
      sale_price: 12.00,
      stock_quantity: 50,
      min_stock: 10,
      category_id: getCatId('Almacenamiento')
    }
  ];

  console.log('\n📦 Creando Productos...');
  let success = 0;
  let errors = 0;

  for (const p of products) {
    if (!p.category_id) {
      console.warn(`⚠️ Categoría no encontrada para ${p.name}`);
      continue;
    }

    const { error } = await supabase.from('products').upsert(p, { onConflict: 'sku' });
    
    if (error) {
      console.error(`❌ Error en ${p.name} (SKU: ${p.sku}): ${error.message}`);
      if (error.message.includes('regex') || error.message.includes('constraint')) {
        console.error('   💡 SUGERENCIA: El constraint de formato de SKU está bloqueando la inserción.');
        console.error('   👉 Ejecuta el SQL de "supabase/migrations/fix_products_sku_constraint.sql" en tu panel de Supabase.');
      }
      errors++;
    } else {
      console.log(`✅ ${p.name} creado`);
      success++;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   ✅ Exitosos: ${success}`);
  console.log(`   ❌ Fallidos: ${errors}`);
}

createITProducts();
