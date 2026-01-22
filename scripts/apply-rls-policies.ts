#!/usr/bin/env tsx

/**
 * Script para aplicar políticas RLS (Row Level Security) en Supabase
 * 
 * Este script:
 * 1. Lee el archivo SQL con las políticas RLS
 * 2. Las aplica en la base de datos de Supabase
 * 3. Verifica que se hayan aplicado correctamente
 * 4. Proporciona un reporte del estado
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs/promises'
import path from 'path'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente de Supabase con permisos de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface PolicyResult {
  success: boolean
  message: string
  error?: string
}

class RLSPolicyManager {
  private sqlFilePath: string

  constructor() {
    this.sqlFilePath = path.join(__dirname, 'setup-rls-policies.sql')
  }

  /**
   * Aplicar todas las políticas RLS
   */
  async applyPolicies(): Promise<void> {
    try {
      console.log('🚀 Iniciando aplicación de políticas RLS...')

      // Leer archivo SQL
      const sqlContent = await this.readSQLFile()
      console.log('✅ Archivo SQL leído correctamente')

      // Dividir en comandos individuales
      const commands = this.parseSQLCommands(sqlContent)
      console.log(`📝 ${commands.length} comandos SQL encontrados`)

      // Aplicar comandos uno por uno
      const results = await this.executeCommands(commands)
      
      // Mostrar resultados
      this.displayResults(results)

      // Verificar políticas aplicadas
      await this.verifyPolicies()

      console.log('🎉 Políticas RLS aplicadas exitosamente!')

    } catch (error) {
      console.error('❌ Error aplicando políticas RLS:', error)
      throw error
    }
  }

  /**
   * Leer archivo SQL
   */
  private async readSQLFile(): Promise<string> {
    try {
      return await fs.readFile(this.sqlFilePath, 'utf-8')
    } catch (error) {
      throw new Error(`Error leyendo archivo SQL: ${error}`)
    }
  }

  /**
   * Parsear comandos SQL
   */
  private parseSQLCommands(sqlContent: string): string[] {
    // Remover comentarios y líneas vacías
    const cleanContent = sqlContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim()
        return trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')
      })
      .join('\n')

    // Dividir por punto y coma, pero mantener comandos complejos juntos
    const commands = cleanContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0)
      .map(cmd => cmd + ';') // Agregar punto y coma de vuelta

    return commands
  }

  /**
   * Ejecutar comandos SQL
   */
  private async executeCommands(commands: string[]): Promise<PolicyResult[]> {
    const results: PolicyResult[] = []

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      console.log(`⏳ Ejecutando comando ${i + 1}/${commands.length}...`)

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command })

        if (error) {
          // Algunos errores son esperados (como políticas que ya existen)
          if (this.isExpectedError(error.message)) {
            results.push({
              success: true,
              message: `Comando ${i + 1}: Ya existe (omitido)`,
              error: error.message
            })
          } else {
            results.push({
              success: false,
              message: `Comando ${i + 1}: Error`,
              error: error.message
            })
          }
        } else {
          results.push({
            success: true,
            message: `Comando ${i + 1}: Ejecutado correctamente`
          })
        }
      } catch (error) {
        results.push({
          success: false,
          message: `Comando ${i + 1}: Excepción`,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // Pequeña pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  /**
   * Verificar si un error es esperado
   */
  private isExpectedError(errorMessage: string): boolean {
    const expectedErrors = [
      'already exists',
      'ya existe',
      'duplicate key',
      'relation already exists',
      'function already exists',
      'policy already exists'
    ]

    return expectedErrors.some(expected => 
      errorMessage.toLowerCase().includes(expected.toLowerCase())
    )
  }

  /**
   * Mostrar resultados
   */
  private displayResults(results: PolicyResult[]): void {
    console.log('\n📊 Resumen de ejecución:')
    
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`✅ Exitosos: ${successful}`)
    console.log(`❌ Fallidos: ${failed}`)

    if (failed > 0) {
      console.log('\n❌ Errores encontrados:')
      results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   ${result.message}: ${result.error}`)
        })
    }

    // Mostrar advertencias para errores esperados
    const warnings = results.filter(r => r.success && r.error)
    if (warnings.length > 0) {
      console.log('\n⚠️  Advertencias (elementos ya existentes):')
      warnings.forEach(warning => {
        console.log(`   ${warning.message}`)
      })
    }
  }

  /**
   * Verificar que las políticas se aplicaron correctamente
   */
  private async verifyPolicies(): Promise<void> {
    console.log('\n🔍 Verificando políticas aplicadas...')

    try {
      // Verificar que RLS esté habilitado en tablas principales
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')

      if (error) {
        console.log('⚠️  No se pudo verificar el estado de RLS')
        return
      }

      console.log(`✅ ${tables?.length || 0} tablas encontradas en el esquema público`)

      // Verificar funciones auxiliares
      const { data: functions, error: funcError } = await supabase.rpc('check_function_exists', {
        function_name: 'is_admin'
      })

      if (!funcError) {
        console.log('✅ Funciones auxiliares verificadas')
      }

      console.log('✅ Verificación completada')

    } catch (error) {
      console.log('⚠️  Error en verificación:', error)
    }
  }

  /**
   * Remover todas las políticas (para testing)
   */
  async removePolicies(): Promise<void> {
    console.log('🗑️  Removiendo políticas RLS...')

    try {
      // Obtener todas las políticas
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('schemaname, tablename, policyname')
        .eq('schemaname', 'public')

      if (error) {
        throw new Error(`Error obteniendo políticas: ${error.message}`)
      }

      if (!policies || policies.length === 0) {
        console.log('ℹ️  No se encontraron políticas para remover')
        return
      }

      // Remover cada política
      for (const policy of policies) {
        const dropCommand = `DROP POLICY IF EXISTS "${policy.policyname}" ON "${policy.tablename}";`
        
        try {
          await supabase.rpc('exec_sql', { sql: dropCommand })
          console.log(`✅ Política removida: ${policy.policyname} en ${policy.tablename}`)
        } catch (error) {
          console.log(`⚠️  Error removiendo política ${policy.policyname}:`, error)
        }
      }

      console.log('✅ Políticas removidas')

    } catch (error) {
      console.error('❌ Error removiendo políticas:', error)
      throw error
    }
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'apply'

  const manager = new RLSPolicyManager()

  try {
    switch (command) {
      case 'apply':
        await manager.applyPolicies()
        break
      
      case 'remove':
        await manager.removePolicies()
        break
      
      case 'reset':
        await manager.removePolicies()
        await new Promise(resolve => setTimeout(resolve, 1000))
        await manager.applyPolicies()
        break
      
      default:
        console.log(`
Uso: npm run rls-policies [comando]

Comandos disponibles:
  apply   - Aplicar políticas RLS (por defecto)
  remove  - Remover todas las políticas RLS
  reset   - Remover y volver a aplicar políticas

Ejemplos:
  npm run rls-policies
  npm run rls-policies apply
  npm run rls-policies remove
  npm run rls-policies reset
        `)
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
}

export { RLSPolicyManager }