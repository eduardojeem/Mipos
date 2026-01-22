import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

interface ConstraintInfo {
  constraint_name: string
  table_name: string
  constraint_type: string
  column_name: string
}

async function validateDatabaseIntegrity() {
  console.log('🔍 VALIDANDO INTEGRIDAD DE BASE DE DATOS')
  console.log('=' .repeat(60))
  console.log(`📍 URL: ${supabaseUrl}`)
  console.log(`🔑 Service Key: ${supabaseServiceKey ? '✅ Configurada' : '❌ Faltante'}\n`)

  try {
    // 1. Verificar estructura de tablas principales
    console.log('📋 1. VERIFICANDO ESTRUCTURA DE TABLAS:')
    console.log('-' .repeat(50))

    const mainTables = [
      'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
      'categories', 'products', 'suppliers', 'customers', 'sales', 
      'sale_items', 'purchases', 'purchase_items', 'inventory_movements',
      'returns', 'return_items', 'user_sessions'
    ]

    const tableStructures: Record<string, TableInfo[]> = {}

    for (const tableName of mainTables) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT 
              table_name,
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND table_schema = 'public'
            ORDER BY ordinal_position;
          `
        })

        if (error) {
          console.log(`❌ ${tableName}: Error al obtener estructura - ${error.message}`)
        } else if (data && data.length > 0) {
          tableStructures[tableName] = data
          console.log(`✅ ${tableName}: ${data.length} columnas`)
        } else {
          console.log(`⚠️  ${tableName}: Sin información de estructura`)
        }
      } catch (err: any) {
        console.log(`❌ ${tableName}: Excepción - ${err.message}`)
      }
    }

    // 2. Verificar índices
    console.log('\n🔍 2. VERIFICANDO ÍNDICES:')
    console.log('-' .repeat(50))

    try {
      const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            indexname,
            tablename,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = 'public'
          ORDER BY tablename, indexname;
        `
      })

      if (indexError) {
        console.log(`❌ Error al obtener índices: ${indexError.message}`)
      } else if (indexes && indexes.length > 0) {
        const indexesByTable: Record<string, IndexInfo[]> = {}
        
        indexes.forEach((index: IndexInfo) => {
          if (!indexesByTable[index.tablename]) {
            indexesByTable[index.tablename] = []
          }
          indexesByTable[index.tablename].push(index)
        })

        Object.entries(indexesByTable).forEach(([tableName, tableIndexes]) => {
          console.log(`✅ ${tableName}: ${tableIndexes.length} índices`)
        })
      } else {
        console.log('⚠️  No se encontraron índices')
      }
    } catch (err: any) {
      console.log(`❌ Error al verificar índices: ${err.message}`)
    }

    // 3. Verificar restricciones (constraints)
    console.log('\n🔒 3. VERIFICANDO RESTRICCIONES:')
    console.log('-' .repeat(50))

    try {
      const { data: constraints, error: constraintError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            tc.constraint_name,
            tc.table_name,
            tc.constraint_type,
            kcu.column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
          ORDER BY tc.table_name, tc.constraint_type;
        `
      })

      if (constraintError) {
        console.log(`❌ Error al obtener restricciones: ${constraintError.message}`)
      } else if (constraints && constraints.length > 0) {
        const constraintsByTable: Record<string, ConstraintInfo[]> = {}
        
        constraints.forEach((constraint: ConstraintInfo) => {
          if (!constraintsByTable[constraint.table_name]) {
            constraintsByTable[constraint.table_name] = []
          }
          constraintsByTable[constraint.table_name].push(constraint)
        })

        Object.entries(constraintsByTable).forEach(([tableName, tableConstraints]) => {
          const primaryKeys = tableConstraints.filter(c => c.constraint_type === 'PRIMARY KEY').length
          const foreignKeys = tableConstraints.filter(c => c.constraint_type === 'FOREIGN KEY').length
          const unique = tableConstraints.filter(c => c.constraint_type === 'UNIQUE').length
          const check = tableConstraints.filter(c => c.constraint_type === 'CHECK').length
          
          console.log(`✅ ${tableName}: PK:${primaryKeys} FK:${foreignKeys} UQ:${unique} CK:${check}`)
        })
      } else {
        console.log('⚠️  No se encontraron restricciones')
      }
    } catch (err: any) {
      console.log(`❌ Error al verificar restricciones: ${err.message}`)
    }

    // 4. Verificar tipos de datos personalizados (ENUMs)
    console.log('\n🎯 4. VERIFICANDO TIPOS PERSONALIZADOS:')
    console.log('-' .repeat(50))

    try {
      const { data: enums, error: enumError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            t.typname as enum_name,
            e.enumlabel as enum_value
          FROM pg_type t 
          JOIN pg_enum e ON t.oid = e.enumtypid  
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
          ORDER BY t.typname, e.enumsortorder;
        `
      })

      if (enumError) {
        console.log(`❌ Error al obtener tipos personalizados: ${enumError.message}`)
      } else if (enums && enums.length > 0) {
        const enumsByType: Record<string, string[]> = {}
        
        enums.forEach((enumItem: any) => {
          if (!enumsByType[enumItem.enum_name]) {
            enumsByType[enumItem.enum_name] = []
          }
          enumsByType[enumItem.enum_name].push(enumItem.enum_value)
        })

        Object.entries(enumsByType).forEach(([enumName, values]) => {
          console.log(`✅ ${enumName}: [${values.join(', ')}]`)
        })
      } else {
        console.log('⚠️  No se encontraron tipos personalizados')
      }
    } catch (err: any) {
      console.log(`❌ Error al verificar tipos personalizados: ${err.message}`)
    }

    // 5. Verificar funciones y triggers
    console.log('\n⚙️  5. VERIFICANDO FUNCIONES Y TRIGGERS:')
    console.log('-' .repeat(50))

    try {
      const { data: functions, error: functionError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            routine_name,
            routine_type,
            data_type as return_type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
          ORDER BY routine_name;
        `
      })

      if (functionError) {
        console.log(`❌ Error al obtener funciones: ${functionError.message}`)
      } else if (functions && functions.length > 0) {
        functions.forEach((func: any) => {
          console.log(`✅ ${func.routine_name} (${func.routine_type}): ${func.return_type || 'void'}`)
        })
      } else {
        console.log('⚠️  No se encontraron funciones personalizadas')
      }
    } catch (err: any) {
      console.log(`❌ Error al verificar funciones: ${err.message}`)
    }

    // 6. Verificar políticas RLS
    console.log('\n🛡️  6. VERIFICANDO POLÍTICAS RLS:')
    console.log('-' .repeat(50))

    try {
      const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
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
          ORDER BY tablename, policyname;
        `
      })

      if (policyError) {
        console.log(`❌ Error al obtener políticas RLS: ${policyError.message}`)
      } else if (policies && policies.length > 0) {
        const policiesByTable: Record<string, any[]> = {}
        
        policies.forEach((policy: any) => {
          if (!policiesByTable[policy.tablename]) {
            policiesByTable[policy.tablename] = []
          }
          policiesByTable[policy.tablename].push(policy)
        })

        Object.entries(policiesByTable).forEach(([tableName, tablePolicies]) => {
          console.log(`✅ ${tableName}: ${tablePolicies.length} políticas RLS`)
        })
      } else {
        console.log('⚠️  No se encontraron políticas RLS')
      }
    } catch (err: any) {
      console.log(`❌ Error al verificar políticas RLS: ${err.message}`)
    }

    // 7. Resumen de validación
    console.log('\n📊 RESUMEN DE VALIDACIÓN:')
    console.log('=' .repeat(60))

    const totalTables = Object.keys(tableStructures).length
    const expectedTables = mainTables.length

    console.log(`📋 Tablas validadas: ${totalTables}/${expectedTables}`)
    console.log(`📈 Porcentaje de validación: ${Math.round((totalTables / expectedTables) * 100)}%`)

    // Mostrar detalles de tablas principales
    console.log('\n📋 DETALLES DE TABLAS PRINCIPALES:')
    console.log('-' .repeat(50))

    const criticalTables = ['users', 'products', 'categories', 'sales', 'sale_items']
    
    criticalTables.forEach(tableName => {
      if (tableStructures[tableName]) {
        const columns = tableStructures[tableName]
        const requiredColumns = columns.filter(c => c.is_nullable === 'NO').length
        const optionalColumns = columns.filter(c => c.is_nullable === 'YES').length
        
        console.log(`✅ ${tableName}:`)
        console.log(`   📊 Total columnas: ${columns.length}`)
        console.log(`   🔒 Requeridas: ${requiredColumns}`)
        console.log(`   📝 Opcionales: ${optionalColumns}`)
        
        // Mostrar columnas clave
        const keyColumns = columns.filter(c => 
          c.column_name.includes('id') || 
          c.column_name.includes('name') || 
          c.column_name.includes('email') ||
          c.column_name.includes('price') ||
          c.column_name.includes('quantity')
        )
        
        if (keyColumns.length > 0) {
          console.log(`   🔑 Columnas clave: ${keyColumns.map(c => c.column_name).join(', ')}`)
        }
      } else {
        console.log(`❌ ${tableName}: No validada`)
      }
    })

    if (totalTables === expectedTables) {
      console.log('\n🎉 ¡VALIDACIÓN COMPLETADA EXITOSAMENTE!')
      console.log('✨ Todas las tablas han sido validadas')
      console.log('🔧 La estructura de base de datos es correcta')
      return { success: true, validatedTables: totalTables, expectedTables }
    } else {
      console.log('\n⚠️  VALIDACIÓN PARCIAL')
      console.log('🔧 Algunas tablas no pudieron ser validadas')
      return { success: false, validatedTables: totalTables, expectedTables }
    }

  } catch (error: any) {
    console.error('❌ Error crítico durante la validación:', error.message)
    return { success: false, error: error.message }
  }
}

// Ejecutar la validación
validateDatabaseIntegrity()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Validación completada exitosamente')
      process.exit(0)
    } else {
      console.log('\n❌ Validación completada con errores')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })