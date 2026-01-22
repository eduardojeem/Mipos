require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createProductsTable() {
  try {
    console.log('🔍 Creando tabla products...');
    
    // SQL para crear la tabla products
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.products (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category_id BIGINT REFERENCES public.categories(id),
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        wholesale_price DECIMAL(10,2) DEFAULT 0,
        offer_price DECIMAL(10,2),
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        images TEXT,
        
        -- Campos específicos de cosméticos
        brand VARCHAR(100),
        shade VARCHAR(50),
        skin_type VARCHAR(50),
        ingredients TEXT,
        volume VARCHAR(20),
        spf INTEGER,
        finish VARCHAR(50),
        coverage VARCHAR(50),
        waterproof BOOLEAN DEFAULT FALSE,
        vegan BOOLEAN DEFAULT FALSE,
        cruelty_free BOOLEAN DEFAULT FALSE,
        expiration_date DATE,
        
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Habilitar RLS
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
      
      -- Crear política para permitir todas las operaciones (para desarrollo)
      CREATE POLICY "Enable all operations for products" ON public.products
        FOR ALL USING (true) WITH CHECK (true);
      
      -- Crear índices
      CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
    `;
    
    // Ejecutar usando una consulta SQL directa
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });
    
    if (error) {
      console.error('❌ Error creando tabla con exec_sql:', error);
      
      // Intentar método alternativo - crear tabla básica
      console.log('🔄 Intentando método alternativo...');
      
      // Verificar si podemos crear un producto directamente
      const testProduct = {
        name: 'Test Product',
        sku: 'TEST-' + Date.now(),
        description: 'Test',
        category_id: 1,
        cost_price: 10,
        sale_price: 15,
        wholesale_price: 12,
        stock_quantity: 100,
        min_stock: 10,
        is_active: true
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('products')
        .insert([testProduct])
        .select();
      
      if (insertError) {
        console.error('❌ Error insertando producto de prueba:', insertError);
        console.log('💡 La tabla products necesita ser creada manualmente en Supabase');
        console.log('📋 SQL para crear la tabla:');
        console.log(createTableSQL);
        return;
      }
      
      console.log('✅ Tabla products funcional - insertando producto exitoso');
      
      // Limpiar producto de prueba
      if (insertData?.[0]?.id) {
        await supabase
          .from('products')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Producto de prueba eliminado');
      }
      
    } else {
      console.log('✅ Tabla products creada exitosamente');
    }
    
    // Verificar que la tabla funciona
    const { data: products, error: selectError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error consultando productos:', selectError);
    } else {
      console.log('✅ Tabla products accesible - Productos:', products?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createProductsTable();