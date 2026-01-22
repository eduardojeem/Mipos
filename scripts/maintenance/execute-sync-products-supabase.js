const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeSyncProductsSQL() {
  try {
    console.log('Ejecutando script de sincronización de productos...');
    
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('sync-products-supabase.sql', 'utf8');
    
    // Dividir en comandos individuales
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Ejecutando ${commands.length} comandos SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Saltar comentarios y comandos vacíos
      if (command.startsWith('--') || command.trim() === '') {
        continue;
      }
      
      try {
        console.log(`Ejecutando comando ${i + 1}/${commands.length}...`);
        
        // Intentar ejecutar usando exec_sql
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: command + ';'
        });
        
        if (error) {
          console.error(`Error en comando ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
          successCount++;
        }
        
      } catch (err) {
        console.error(`Error ejecutando comando ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log(`\n=== RESUMEN ===`);
    console.log(`Comandos exitosos: ${successCount}`);
    console.log(`Comandos con error: ${errorCount}`);
    
    // Verificar que las tablas se crearon correctamente
    console.log('\nVerificando tablas creadas...');
    
    try {
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('count', { count: 'exact', head: true });
      
      if (catError) {
        console.log('❌ Error verificando categories:', catError.message);
      } else {
        console.log('✅ Tabla categories verificada');
      }
    } catch (err) {
      console.log('❌ Error verificando categories:', err.message);
    }
    
    try {
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('count', { count: 'exact', head: true });
      
      if (prodError) {
        console.log('❌ Error verificando products:', prodError.message);
      } else {
        console.log('✅ Tabla products verificada');
      }
    } catch (err) {
      console.log('❌ Error verificando products:', err.message);
    }
    
    try {
      const { data: movements, error: movError } = await supabase
        .from('inventory_movements')
        .select('count', { count: 'exact', head: true });
      
      if (movError) {
        console.log('❌ Error verificando inventory_movements:', movError.message);
      } else {
        console.log('✅ Tabla inventory_movements verificada');
      }
    } catch (err) {
      console.log('❌ Error verificando inventory_movements:', err.message);
    }
    
    console.log('\n🎉 Script de sincronización completado');

    // Insertar productos de muestra (accesorios y repuestos de celulares)
    try {
      console.log('\nAgregando productos de muestra (accesorios/repuestos) ...');
      // Asegurar categorías necesarias
      const ensureCategory = async (name, description) => {
        const { data: cat, error: catErr } = await supabase
          .from('categories')
          .select('*')
          .eq('name', name)
          .limit(1)
          .maybeSingle();
        if (catErr) throw new Error(catErr.message);
        if (cat && cat.id) return cat;
        const { data: created, error: createErr } = await supabase
          .from('categories')
          .insert({ name, description })
          .select('*')
          .maybeSingle();
        if (createErr) throw new Error(createErr.message);
        return created;
      };

      const accesorios = await ensureCategory('Accesorios', 'Accesorios para dispositivos móviles');
      const repuestos = await ensureCategory('Repuestos Celulares', 'Repuestos y partes para celulares');

      const products = [
        // Repuestos
        { name: 'Pantalla iPhone 11 (OLED)', sku: 'REP-IPH11-SCR-OLED', category_id: repuestos.id, description: 'Pantalla de reemplazo OLED para iPhone 11', cost_price: 85.00, sale_price: 149.99, stock_quantity: 12, min_stock: 3, brand: 'Apple' },
        { name: 'Batería Samsung Galaxy S10', sku: 'REP-SGS10-BATT', category_id: repuestos.id, description: 'Batería original para Samsung Galaxy S10', cost_price: 18.00, sale_price: 39.99, stock_quantity: 25, min_stock: 5, brand: 'Samsung' },
        { name: 'Módulo Cámara Xiaomi Redmi Note 9', sku: 'REP-XRN9-CAM', category_id: repuestos.id, description: 'Cámara trasera para Redmi Note 9', cost_price: 12.00, sale_price: 24.99, stock_quantity: 18, min_stock: 4, brand: 'Xiaomi' },
        { name: 'Conector de Carga USB-C Universal', sku: 'REP-USB-C-CONN', category_id: repuestos.id, description: 'Puerto de carga USB-C de repuesto', cost_price: 3.50, sale_price: 9.99, stock_quantity: 60, min_stock: 10, brand: 'Generic' },
        { name: 'Altavoz Auricular iPhone XR', sku: 'REP-IPHXR-SPK', category_id: repuestos.id, description: 'Auricular superior para iPhone XR', cost_price: 6.00, sale_price: 14.99, stock_quantity: 22, min_stock: 5, brand: 'Apple' },
        { name: 'Pantalla iPhone 12 (OLED)', sku: 'REP-IPH12-SCR-OLED', category_id: repuestos.id, description: 'Pantalla OLED para iPhone 12', cost_price: 92.00, sale_price: 169.99, stock_quantity: 14, min_stock: 3, brand: 'Apple' },
        { name: 'Pantalla iPhone XR (LCD)', sku: 'REP-IPHXR-SCR-LCD', category_id: repuestos.id, description: 'Pantalla LCD para iPhone XR', cost_price: 45.00, sale_price: 99.99, stock_quantity: 20, min_stock: 4, brand: 'Apple' },
        { name: 'Batería Samsung Galaxy S20', sku: 'REP-SGS20-BATT', category_id: repuestos.id, description: 'Batería original para Samsung Galaxy S20', cost_price: 22.00, sale_price: 49.99, stock_quantity: 20, min_stock: 5, brand: 'Samsung' },
        { name: 'Pantalla Samsung A52', sku: 'REP-SGA52-SCR', category_id: repuestos.id, description: 'Pantalla completa para Samsung A52', cost_price: 35.00, sale_price: 89.99, stock_quantity: 16, min_stock: 4, brand: 'Samsung' },
        { name: 'Pantalla Xiaomi Redmi Note 10', sku: 'REP-XRN10-SCR', category_id: repuestos.id, description: 'Pantalla para Redmi Note 10', cost_price: 28.00, sale_price: 69.99, stock_quantity: 18, min_stock: 4, brand: 'Xiaomi' },
        { name: 'Batería Poco X3 NFC', sku: 'REP-POCOX3-BATT', category_id: repuestos.id, description: 'Batería para Poco X3 NFC', cost_price: 17.00, sale_price: 39.99, stock_quantity: 24, min_stock: 6, brand: 'Xiaomi' },
        { name: 'Batería Motorola G8 Power', sku: 'REP-MOTG8P-BATT', category_id: repuestos.id, description: 'Batería para Motorola G8 Power', cost_price: 16.00, sale_price: 37.99, stock_quantity: 20, min_stock: 5, brand: 'Motorola' },

        // Accesorios
        { name: 'Cargador Rápido USB-C 20W', sku: 'ACC-USB-C-20W', category_id: accesorios.id, description: 'Cargador rápido USB-C de 20W con protección', cost_price: 6.50, sale_price: 14.99, stock_quantity: 80, min_stock: 12, brand: 'Anker' },
        { name: 'Cable Lightning 1m', sku: 'ACC-LIGHTNING-1M', category_id: accesorios.id, description: 'Cable Lightning de 1 metro, certificado', cost_price: 4.00, sale_price: 9.99, stock_quantity: 120, min_stock: 20, brand: 'Apple' },
        { name: 'Funda Protectora TPU iPhone 12', sku: 'ACC-CASE-IPH12-TPU', category_id: accesorios.id, description: 'Funda TPU transparente para iPhone 12', cost_price: 2.20, sale_price: 7.99, stock_quantity: 90, min_stock: 15, brand: 'Generic' },
        { name: 'Vidrio Templado Samsung A52', sku: 'ACC-GLASS-SGA52', category_id: accesorios.id, description: 'Protector de pantalla 9H para Samsung A52', cost_price: 1.20, sale_price: 5.99, stock_quantity: 150, min_stock: 30, brand: 'Generic' },
        { name: 'Auriculares Bluetooth TWS', sku: 'ACC-TWS-BT', category_id: accesorios.id, description: 'Auriculares Bluetooth True Wireless con estuche', cost_price: 12.00, sale_price: 29.99, stock_quantity: 40, min_stock: 6, brand: 'QCY' },
        { name: 'Power Bank 10000mAh', sku: 'ACC-PBANK-10K', category_id: accesorios.id, description: 'Batería externa compacta de 10000mAh', cost_price: 9.50, sale_price: 24.99, stock_quantity: 55, min_stock: 8, brand: 'Xiaomi' },
        { name: 'Adaptador SIM (Nano a Micro)', sku: 'ACC-SIM-ADAPT', category_id: accesorios.id, description: 'Kit adaptador de tarjetas SIM', cost_price: 0.50, sale_price: 2.99, stock_quantity: 200, min_stock: 40, brand: 'Generic' },
        { name: 'Soporte Magnético para Auto', sku: 'ACC-CAR-MAG', category_id: accesorios.id, description: 'Soporte magnético de rejilla para smartphone', cost_price: 2.80, sale_price: 6.99, stock_quantity: 70, min_stock: 10, brand: 'Baseus' },
        { name: 'Cargador Inalámbrico Qi 15W', sku: 'ACC-QI-15W', category_id: accesorios.id, description: 'Cargador inalámbrico estándar Qi de 15W', cost_price: 7.50, sale_price: 19.99, stock_quantity: 60, min_stock: 10, brand: 'Baseus' },
        { name: 'Soporte de Escritorio Ajustable', sku: 'ACC-DESK-STAND', category_id: accesorios.id, description: 'Soporte ajustable para smartphone/tablet', cost_price: 3.00, sale_price: 8.99, stock_quantity: 90, min_stock: 15, brand: 'Generic' },
        { name: 'Cable USB-C 2m Trenzado', sku: 'ACC-USBC-2M-BRAID', category_id: accesorios.id, description: 'Cable USB-C 2 metros trenzado duradero', cost_price: 2.80, sale_price: 7.99, stock_quantity: 130, min_stock: 25, brand: 'UGREEN' },
        { name: 'Funda Antishock Samsung S21', sku: 'ACC-CASE-SGS21-ASHK', category_id: accesorios.id, description: 'Funda antishock para Samsung S21', cost_price: 2.60, sale_price: 8.99, stock_quantity: 85, min_stock: 15, brand: 'Spigen' },
        { name: 'Pack Protección iPhone 12 (Funda+Vidrio+Limpieza)', sku: 'ACC-PACK-IPH12-PROT', category_id: accesorios.id, description: 'Pack protector: funda TPU + vidrio 9H + kit limpieza', cost_price: 4.50, sale_price: 12.99, stock_quantity: 70, min_stock: 12, brand: 'Generic' },
      ];

      // Upsert por SKU para evitar duplicados
      for (const p of products) {
        const { error: upErr } = await supabase
          .from('products')
          .upsert({
            name: p.name,
            sku: p.sku,
            category_id: p.category_id,
            description: p.description,
            cost_price: p.cost_price,
            sale_price: p.sale_price,
            stock_quantity: p.stock_quantity,
            min_stock: p.min_stock,
            brand: p.brand,
          }, { onConflict: 'sku' });
        if (upErr) console.error('Error insertando', p.sku, upErr.message);
        else console.log('✅ Insertado/actualizado', p.sku);
      }

      console.log('✅ Productos de accesorios/repuestos agregados');
    } catch (e) {
      console.error('❌ Error agregando productos de muestra:', e.message);
    }

    // Conversión de precios a Guaraní (PYG)
    try {
      const RATE = Number(process.env.PYG_RATE || 7500);
      console.log(`\nConvirtiendo precios a Guaraní (PYG) usando tasa ${RATE} ...`);
      const sql = `UPDATE public.products SET 
        sale_price = ROUND(sale_price * ${RATE}),
        cost_price = ROUND(cost_price * ${RATE})`;
      const { error: convErr } = await supabase.rpc('exec_sql', { sql: sql + ';' });
      if (convErr) throw new Error(convErr.message);
      console.log('✅ Conversión de precios a PYG completada');
    } catch (e) {
      console.error('❌ Error convirtiendo precios a PYG:', e.message);
    }
  
  } catch (error) {
    console.error('Error general:', error.message);
  }
}

executeSyncProductsSQL();