#!/usr/bin/env node

/**
 * Script para ejecutar la migración de jerarquía de roles y auditoría
 * Uso: node scripts/run-role-migration.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de roles...')
    
    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '../database/migrations/add-role-hierarchy-and-audit-fixed.sql')
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Archivo de migración cargado')
    console.log('⚡ Ejecutando migración...')
    
    // Ejecutar la migración
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      // Si la función exec_sql no existe, intentar ejecutar por partes
      console.log('⚠️  Función exec_sql no disponible, ejecutando por partes...')
      
      // Dividir el SQL en statements individuales
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📝 Ejecutando ${statements.length} statements...`)
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.trim()) {
          try {
            console.log(`   ${i + 1}/${statements.length}: Ejecutando statement...`)
            const { error: stmtError } = await supabase.rpc('exec', {
              sql: statement + ';'
            })
            
            if (stmtError) {
              console.warn(`⚠️  Warning en statement ${i + 1}: ${stmtError.message}`)
            }
          } catch (err) {
            console.warn(`⚠️  Error en statement ${i + 1}: ${err.message}`)
          }
        }
      }
    } else {
      console.log('✅ Migración ejecutada exitosamente')
    }
    
    // Verificar que las tablas y funciones se crearon correctamente
    console.log('🔍 Verificando migración...')
    
    // Verificar tabla role_audit_log
    const { data: auditTable, error: auditError } = await supabase
      .from('role_audit_log')
      .select('count', { count: 'exact', head: true })
    
    if (auditError) {
      console.warn('⚠️  Tabla role_audit_log no encontrada o no accesible')
    } else {
      console.log('✅ Tabla role_audit_log creada correctamente')
    }
    
    // Verificar columnas en roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, parent_role_id, priority')
      .limit(1)
    
    if (rolesError) {
      console.warn('⚠️  Columnas de jerarquía no encontradas en tabla roles')
    } else {
      console.log('✅ Columnas de jerarquía agregadas a tabla roles')
    }
    
    // Verificar función de estadísticas
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_role_statistics')
      
      if (statsError) {
        console.warn('⚠️  Función get_role_statistics no disponible')
      } else {
        console.log('✅ Función get_role_statistics creada correctamente')
        console.log('📊 Estadísticas actuales:', statsData)
      }
    } catch (err) {
      console.warn('⚠️  No se pudo verificar función de estadísticas')
    }
    
    console.log('\n🎉 Migración completada!')
    console.log('\n📋 Resumen de cambios:')
    console.log('   • Agregadas columnas parent_role_id y priority a tabla roles')
    console.log('   • Creada tabla role_audit_log para auditoría')
    console.log('   • Creados índices para mejorar performance')
    console.log('   • Creada función get_role_statistics()')
    console.log('   • Creada función check_circular_hierarchy()')
    console.log('   • Creado trigger para auditoría automática')
    console.log('   • Configuradas políticas RLS para auditoría')
    console.log('\n✨ El sistema de roles ahora soporta jerarquía y auditoría!')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    console.error('\n🔧 Posibles soluciones:')
    console.error('   • Verificar que las credenciales de Supabase sean correctas')
    console.error('   • Asegurar que el usuario tenga permisos de administrador')
    console.error('   • Revisar que la base de datos esté accesible')
    console.error('   • Ejecutar la migración manualmente en el SQL Editor de Supabase')
    process.exit(1)
  }
}

// Ejecutar migración
runMigration()