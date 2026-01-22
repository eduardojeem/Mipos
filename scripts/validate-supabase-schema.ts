import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TableInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

interface IndexInfo {
  indexname: string
  tablename: string
  indexdef: string
}

async function validateSupabaseSchema() {
  console.log('🔍 Verificando esquema de la base de datos de Supabase...\n')

  try {
    // 1. Verificar conexión
    console.log('1. Verificando conexión a Supabase...')
    const { data: connectionTest, error: connectionError } = await supabase
      .rpc('exec_sql', { sql: 'SELECT 1 AS ok' })

    if (connectionError) {
      console.error('❌ Error de conexión:', connectionError.message)
      return
    }
    console.log('✅ Conexión exitosa\n')

    // 2. Obtener todas las tablas del esquema público
    console.log('2. Obteniendo tablas del esquema público...')
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name
        `
      })

    if (tablesError) {
      console.error('❌ Error obteniendo tablas:', tablesError.message)
      return
    }

    console.log('📋 Tablas encontradas:')
    if (tables && tables.length > 0) {
      tables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`)
      })
    } else {
      console.log('  No se encontraron tablas')
    }
    console.log()

    // 3. Verificar estructura de tablas principales
    console.log('3. Verificando estructura de tablas principales...')
    const mainTables = ['users', 'products', 'categories', 'sales', 'sale_items', 'inventory_movements']
    
    for (const tableName of mainTables) {
      console.log(`\n📊 Tabla: ${tableName}`)
      
      // Verificar si la tabla existe
      const { data: tableExists } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
            )
          `
        })

      if (!tableExists || !tableExists[0]?.exists) {
        console.log(`  ⚠️  Tabla '${tableName}' no encontrada`)
        continue
      }

      // Obtener columnas de la tabla
      const { data: columns } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `
        })

      if (columns && columns.length > 0) {
        console.log('  Columnas:')
        columns.forEach((col: TableInfo) => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`    - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
        })

        // Validación específica para inventory_movements
        if (tableName === 'inventory_movements') {
          const expected = [
            { name: 'id', type: 'text', nullable: 'NO' },
            { name: 'product_id', type: 'text', nullable: 'NO' },
            // movement_type puede ser 'text' o 'USER-DEFINED' si es enum
            { name: 'movement_type', type: 'text', nullable: 'NO' },
            { name: 'quantity', type: 'integer', nullable: 'NO' },
            { name: 'reference_type', type: 'text', nullable: 'YES' },
            { name: 'reference_id', type: 'text', nullable: 'YES' },
            { name: 'notes', type: 'text', nullable: 'YES' },
            { name: 'user_id', type: 'text', nullable: 'YES' },
            { name: 'created_at', type: 'timestamp with time zone', nullable: 'NO' },
            { name: 'updated_at', type: 'timestamp with time zone', nullable: 'NO' }
          ]
          const colMap = new Map<string, TableInfo>(columns.map((c: TableInfo) => [c.column_name, c]))
          const missing = expected.filter(e => !colMap.has(e.name))
          const extra = columns.filter((c: TableInfo) => !expected.some(e => e.name === c.column_name))
          const typeMismatches = expected
            .filter(e => colMap.has(e.name))
            .filter(e => {
              const actual: TableInfo = colMap.get(e.name)!
              const okType = e.name === 'movement_type'
                ? (actual.data_type === 'text' || actual.data_type === 'USER-DEFINED')
                : actual.data_type.toLowerCase() === e.type
              const okNull = actual.is_nullable === (e.nullable === 'YES' ? 'YES' : 'NO')
              return !(okType && okNull)
            })
          if (missing.length === 0 && typeMismatches.length === 0) {
            console.log('  ✅ Columnas de inventory_movements coinciden con el esquema esperado')
          } else {
            if (missing.length > 0) {
              console.log('  ❌ Faltan columnas:', missing.map(m => m.name).join(', '))
            }
            if (typeMismatches.length > 0) {
              console.log('  ❌ Columnas con tipo/nullable distinto:', typeMismatches.map(m => m.name).join(', '))
            }
            if (extra.length > 0) {
              console.log('  ⚠️ Columnas extra no esperadas:', extra.map((c:any)=>c.column_name).join(', '))
            }
          }
        }
      }
    }

    // 4. Verificar índices
    console.log('\n4. Verificando índices de la base de datos...')
    const { data: indexes } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            indexname,
            tablename,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname
        `
      })

    if (indexes && indexes.length > 0) {
      console.log('📈 Índices encontrados:')
      let currentTable = ''
      indexes.forEach((idx: IndexInfo) => {
        if (idx.tablename !== currentTable) {
          currentTable = idx.tablename
          console.log(`\n  Tabla: ${idx.tablename}`)
        }
        console.log(`    - ${idx.indexname}`)
      })
    } else {
      console.log('  No se encontraron índices personalizados')
    }

    // 5. Verificar políticas RLS
    console.log('\n5. Verificando políticas de Row Level Security (RLS)...')
    const { data: policies } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual
          FROM pg_policies
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname
        `
      })

    if (policies && policies.length > 0) {
      console.log('🔒 Políticas RLS encontradas:')
      let currentTable = ''
      policies.forEach((policy: any) => {
        if (policy.tablename !== currentTable) {
          currentTable = policy.tablename
          console.log(`\n  Tabla: ${policy.tablename}`)
        }
        console.log(`    - ${policy.policyname} (${policy.cmd})`)
      })
    } else {
      console.log('  No se encontraron políticas RLS')
    }

    // 6. Verificar funciones personalizadas
    console.log('\n6. Verificando funciones personalizadas...')
    const { data: functions } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            routine_name,
            routine_type,
            data_type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
          AND routine_name NOT LIKE 'pg_%'
          ORDER BY routine_name
        `
      })

    if (functions && functions.length > 0) {
      console.log('⚙️ Funciones personalizadas encontradas:')
      functions.forEach((func: any) => {
        console.log(`  - ${func.routine_name} (${func.routine_type})`)
      })
    } else {
      console.log('  No se encontraron funciones personalizadas')
    }

    console.log('\n✅ Verificación del esquema completada exitosamente')

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
  }
}

// Ejecutar la validación
validateSupabaseSchema()