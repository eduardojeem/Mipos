const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
// Prefer .env.local, then fallback to .env
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null; // e.g. tag in $tag$

  const startsWith = (str, pos, prefix) => str.substr(pos, prefix.length) === prefix;

  while (i < sql.length) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    // Handle end of line comment
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        current += ch; // keep newline
      }
      i++;
      continue;
    }

    // Handle end of block comment
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Detect start of line comment
    if (!inSingle && !inDouble && !dollarTag && ch === '-' && next === '-') {
      inLineComment = true;
      i += 2;
      continue;
    }

    // Detect start of block comment
    if (!inSingle && !inDouble && !dollarTag && ch === '/' && next === '*') {
      inBlockComment = true;
      i += 2;
      continue;
    }

    // Detect dollar-quote start: $tag$
    if (!inSingle && !inDouble && !dollarTag && ch === '$') {
      // read tag
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      if (j < sql.length && sql[j] === '$') {
        dollarTag = sql.substring(i, j + 1); // includes both $ e.g. $tag$
        current += dollarTag;
        i = j + 1;
        continue;
      }
    }

    // Detect dollar-quote end
    if (dollarTag) {
      if (startsWith(sql, i, dollarTag)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      // Inside dollar quote, just append
      current += ch;
      i++;
      continue;
    }

    // Toggle single quotes
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }

    // Toggle double quotes
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      current += ch;
      i++;
      continue;
    }

    // Statement delimiter only when not inside quotes/comments/dollar
    if (!inSingle && !inDouble && !inLineComment && !inBlockComment && !dollarTag && ch === ';') {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = '';
      i++;
      continue;
    }

    // Default append
    current += ch;
    i++;
  }

  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);

  // Filter out empty statements just in case
  return statements.filter(s => s.trim().length > 0);
}

async function executeSupabaseSQL() {
  console.log('🔄 EJECUTANDO SCRIPT SQL EN SUPABASE');
  console.log('=' .repeat(60));

  try {
    // Leer el archivo SQL (ruta por argumento o default)
    const sqlFilePath = process.argv[2] || './sync-products-supabase.sql';
    console.log(`📂 Archivo SQL: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Dividir el SQL en comandos individuales respetando $$ y comentarios
    const sqlCommands = splitSqlStatements(sqlContent);

    console.log(`📋 Ejecutando ${sqlCommands.length} comandos SQL...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // Saltar comentarios y comandos vacíos
      if (command.startsWith('--') || command.startsWith('/*') || command.trim().length < 10) {
        continue;
      }

      try {
        console.log(`\n${i + 1}. Ejecutando comando...`);
        
        // Ejecutar el comando SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: command + ';' 
        });

        const isRpcErrorObject = (d) => {
          try {
            if (!d || typeof d !== 'object') return false;
            const status = (d.status || '').toString().toLowerCase();
            if (status === 'error') return true;
            if (typeof d.message === 'string' && /^error[:]?/i.test(d.message)) return true;
            return false;
          } catch (_) { return false; }
        };

        const isRpcSuccessObject = (d) => {
          try {
            if (!d || typeof d !== 'object') return false;
            const status = (d.status || '').toString().toLowerCase();
            return status === 'success';
          } catch (_) { return false; }
        };

        if (error) {
          // Intentar ejecutar directamente si RPC falla
          const { error: directError } = await supabase
            .from('_temp_sql_execution')
            .select('*')
            .limit(0);
          
          if (directError && directError.message.includes('relation "_temp_sql_execution" does not exist')) {
            // Crear función temporal para ejecutar SQL
            await createSQLExecutionFunction();
            
            // Reintentar
            const { data: retryData, error: retryError } = await supabase.rpc('exec_sql', { 
              sql: command + ';' 
            });
            
            if (retryError) {
              console.log(`⚠️  Comando ${i + 1} falló:`, retryError.message);
              errorCount++;
            } else if (typeof retryData === 'string' && retryData.startsWith('ERROR:')) {
              console.log(`⚠️  Comando ${i + 1} falló (RPC retornó):`, retryData);
              errorCount++;
            } else if (isRpcErrorObject(retryData)) {
              console.log(`⚠️  Comando ${i + 1} falló (RPC status error):`, retryData.message || retryData);
              errorCount++;
            } else {
              console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
              successCount++;
            }
          } else {
            console.log(`⚠️  Comando ${i + 1} falló:`, error.message);
            errorCount++;
          }
        } else {
          if (typeof data === 'string' && data.startsWith('ERROR:')) {
            console.log(`⚠️  Comando ${i + 1} falló (RPC retornó):`, data);
            errorCount++;
          } else if (isRpcErrorObject(data)) {
            console.log(`⚠️  Comando ${i + 1} falló (RPC status error):`, data.message || data);
            errorCount++;
          } else if (isRpcSuccessObject(data) || typeof data === 'string') {
            console.log(`✅ Comando ${i + 1} ejecutado exitosamente`);
            successCount++;
          } else {
            // Respuesta desconocida, asumir éxito pero mostrar
            console.log(`✅ Comando ${i + 1} ejecutado (respuesta RPC):`, data);
            successCount++;
          }
        }

        // Pausa pequeña entre comandos
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (cmdError) {
        console.log(`❌ Error ejecutando comando ${i + 1}:`, cmdError.message);
        errorCount++;
      }
    }

    console.log('\n📊 RESUMEN DE EJECUCIÓN:');
    console.log('=' .repeat(40));
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos fallidos: ${errorCount}`);
    console.log(`📋 Total comandos: ${successCount + errorCount}`);

    // Verificar que las tablas se crearon
    console.log('\n🔍 VERIFICANDO TABLAS CREADAS:');
    await verifyTables();

  } catch (error) {
    console.error('❌ Error ejecutando script SQL:', error);
  }
}

async function createSQLExecutionFunction() {
  console.log('🔧 Creando función de ejecución SQL...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'SUCCESS';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `;

  try {
    // No es posible crear la función exec_sql vía RPC si no existe.
    // Mostrar instrucciones claras para crearla manualmente en el SQL Editor.
    console.log('⚠️  La función RPC exec_sql no existe aún.');
    console.log('👉 Abre el SQL Editor de Supabase y ejecuta: scripts/create-exec-sql-function.sql');
    console.log('   Esto creará la función pública exec_sql(sql text) con SECURITY DEFINER.');
  } catch (error) {
    console.log('⚠️  Error creando función SQL:', error.message);
  }
}

async function verifyTables() {
  try {
    // Verificar tabla categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('count')
      .limit(1);

    if (!catError) {
      console.log('✅ Tabla categories: OK');
    } else {
      console.log('❌ Tabla categories: No encontrada');
    }

    // Verificar tabla products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (!prodError) {
      console.log('✅ Tabla products: OK');
    } else {
      console.log('❌ Tabla products: No encontrada');
      console.log('   Detalle:', prodError.message || prodError);
    }

    // Verificar tabla inventory_movements
    const { data: inventory, error: invError } = await supabase
      .from('inventory_movements')
      .select('count')
      .limit(1);

    if (!invError) {
      console.log('✅ Tabla inventory_movements: OK');
    } else {
      console.log('❌ Tabla inventory_movements: No encontrada');
      console.log('   Detalle:', invError.message || invError);
    }

    // Contar registros existentes
    console.log('\n📊 CONTEO DE REGISTROS:');
    
    const { count: catCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });
    
    const { count: prodCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    console.log(`📋 Categorías: ${catCount || 0}`);
    console.log(`📦 Productos: ${prodCount || 0}`);

  } catch (error) {
    console.log('⚠️  Error verificando tablas:', error.message);
  }
}

// Función alternativa para crear tablas básicas
async function createBasicTables() {
  console.log('🔧 Creando tablas básicas...');

  // Crear tabla categories
  try {
    const { error: catError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.categories (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
      `
    });

    if (!catError) {
      console.log('✅ Tabla categories creada');
    }
  } catch (error) {
    console.log('⚠️  Error creando tabla categories');
  }

  // Crear tabla products
  try {
    const { error: prodError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.products (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name TEXT NOT NULL,
          sku TEXT UNIQUE NOT NULL,
          category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
          description TEXT,
          cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          stock_quantity INTEGER DEFAULT 0 NOT NULL,
          min_stock INTEGER DEFAULT 0 NOT NULL,
          images TEXT DEFAULT '',
          brand TEXT,
          shade TEXT,
          skin_type TEXT,
          ingredients TEXT,
          volume TEXT,
          spf INTEGER,
          finish TEXT,
          coverage TEXT,
          waterproof BOOLEAN,
          vegan BOOLEAN,
          cruelty_free BOOLEAN,
          expiration_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
      `
    });

    if (!prodError) {
      console.log('✅ Tabla products creada');
    }
  } catch (error) {
    console.log('⚠️  Error creando tabla products');
  }
}

// Ejecutar el script
executeSupabaseSQL()
  .then(() => {
    console.log('\n🎉 SCRIPT COMPLETADO');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });