require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('🔧 Creando tablas faltantes en Supabase...');
  
  // Crear tabla categories
  const categoriesSQL = `
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;
  
  // Crear tabla products si no existe
  const productsSQL = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      cost DECIMAL(10,2) DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      max_stock INTEGER,
      sku TEXT UNIQUE,
      barcode TEXT,
      category_id TEXT REFERENCES categories(id),
      supplier_id TEXT,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;
  
  // Crear tabla suppliers si no existe
  const suppliersSQL = `
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;
  
  try {
    // Ejecutar creación de categories
    console.log('📋 Creando tabla categories...');
    const { error: categoriesError } = await supabase.rpc('exec', {
      sql: categoriesSQL
    });
    
    if (categoriesError) {
      console.log('⚠️  Intentando método alternativo para categories...');
      // Método alternativo usando query directo
      const { error: altError } = await supabase
        .from('categories')
        .select('id')
        .limit(1);
      
      if (altError && altError.code === 'PGRST116') {
        console.log('❌ Tabla categories no existe. Necesita creación manual.');
      }
    } else {
      console.log('✅ Tabla categories creada/verificada');
    }
    
    // Insertar categorías básicas
    console.log('📦 Insertando categorías básicas...');
    const { error: insertError } = await supabase
      .from('categories')
      .upsert([
        { name: 'General', description: 'Productos generales', is_active: true },
        { name: 'Bebidas', description: 'Bebidas y refrescos', is_active: true },
        { name: 'Comida', description: 'Productos alimenticios', is_active: true },
        { name: 'Limpieza', description: 'Productos de limpieza', is_active: true },
        { name: 'Electrónicos', description: 'Productos electrónicos', is_active: true }
      ], { onConflict: 'name' });
    
    if (insertError) {
      console.log('⚠️  Error insertando categorías:', insertError.message);
    } else {
      console.log('✅ Categorías básicas insertadas');
    }
    
    // Verificar tablas existentes
    console.log('🔍 Verificando tablas...');
    const tables = ['categories', 'products', 'customers', 'users'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${data?.length || 0} registros`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createTables();