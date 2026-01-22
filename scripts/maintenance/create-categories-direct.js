const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createCategoriesTable() {
  console.log('🔧 Creando tabla categories directamente en Supabase...');
  
  // Usar el cliente de servicio con permisos completos
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // 1. Crear la tabla categories usando SQL directo
    console.log('📋 Ejecutando SQL para crear tabla categories...');
    
    const createTableSQL = `
      -- Crear la tabla categories
      CREATE TABLE IF NOT EXISTS public.categories (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      -- Crear índices
      CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
      CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });

    if (createError) {
      console.log('⚠️  Error creando tabla (intentando método alternativo):', createError.message);
      
      // Método alternativo: usar el cliente REST directamente
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: createTableSQL })
      });

      if (!response.ok) {
        console.log('❌ Error con método alternativo también');
        console.log('📝 Creando tabla usando INSERT directo...');
        
        // Método directo: intentar insertar datos (la tabla debería existir)
        const { data: testData, error: testError } = await supabase
          .from('categories')
          .select('*')
          .limit(1);

        if (testError) {
          console.log('❌ La tabla categories no existe. Debe crearse manualmente en Supabase Dashboard.');
          console.log('📋 Usa el archivo: supabase-create-categories.sql');
          return false;
        }
      } else {
        console.log('✅ Tabla creada exitosamente con método alternativo');
      }
    } else {
      console.log('✅ Tabla creada exitosamente');
    }

    // 2. Insertar categorías básicas
    console.log('📝 Insertando categorías básicas...');
    
    const categories = [
      { name: 'General', description: 'Productos generales', is_active: true },
      { name: 'Bebidas', description: 'Bebidas y refrescos', is_active: true },
      { name: 'Comida', description: 'Productos alimenticios', is_active: true },
      { name: 'Limpieza', description: 'Productos de limpieza', is_active: true },
      { name: 'Electrónicos', description: 'Productos electrónicos', is_active: true },
      { name: 'Papelería', description: 'Artículos de oficina y papelería', is_active: true },
      { name: 'Hogar', description: 'Artículos para el hogar', is_active: true },
      { name: 'Salud', description: 'Productos de salud e higiene', is_active: true }
    ];

    for (const category of categories) {
      const { data, error } = await supabase
        .from('categories')
        .upsert(category, { 
          onConflict: 'name',
          ignoreDuplicates: true 
        })
        .select();

      if (error) {
        console.log(`⚠️  Error insertando categoría "${category.name}":`, error.message);
      } else {
        console.log(`✅ Categoría "${category.name}" insertada/actualizada`);
      }
    }

    // 3. Verificar el resultado
    console.log('🔍 Verificando categorías creadas...');
    const { data: allCategories, error: selectError } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (selectError) {
      console.log('❌ Error verificando categorías:', selectError.message);
      return false;
    }

    console.log(`✅ Total de categorías en la base de datos: ${allCategories.length}`);
    allCategories.forEach(cat => {
      console.log(`   - ${cat.name}: ${cat.description}`);
    });

    return true;

  } catch (error) {
    console.error('❌ Error general:', error);
    return false;
  }
}

// Ejecutar el script
createCategoriesTable()
  .then(success => {
    if (success) {
      console.log('\n🎉 ¡Tabla categories creada exitosamente!');
      console.log('💡 Ahora puedes probar las APIs de categorías');
    } else {
      console.log('\n❌ No se pudo crear la tabla categories');
      console.log('📋 Ejecuta manualmente el archivo: supabase-create-categories.sql');
      console.log('🔗 En: Supabase Dashboard > SQL Editor');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });