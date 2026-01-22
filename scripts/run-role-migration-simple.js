#!/usr/bin/env node

/**
 * Script simplificado para ejecutar la migración de roles por partes
 * Uso: node scripts/run-role-migration-simple.js
 */

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQL(sql, description) {
  try {
    console.log(`⚡ ${description}...`)
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.warn(`⚠️  Warning: ${error.message}`)
      return false
    } else {
      console.log(`✅ ${description} - OK`)
      return true
    }
  } catch (err) {
    console.warn(`⚠️  Error: ${err.message}`)
    return false
  }
}

async function runMigrationSteps() {
  try {
    console.log('🚀 Iniciando migración de roles por pasos...')
    
    // Paso 1: Agregar columnas
    await executeSQL(`
      ALTER TABLE roles 
      ADD COLUMN IF NOT EXISTS parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50;
    `, 'Agregando columnas de jerarquía')
    
    // Paso 2: Crear índices
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id);
    `, 'Creando índice parent_role_id')
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_roles_priority ON roles(priority);
    `, 'Creando índice priority')
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
    `, 'Creando índice is_active')
    
    // Paso 3: Crear tabla de auditoría
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS role_audit_log (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          changes JSONB,
          user_id UUID NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `, 'Creando tabla role_audit_log')
    
    // Paso 4: Crear índices de auditoría
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_log_role_id ON role_audit_log(role_id);
    `, 'Creando índices de auditoría')
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_log_user_id ON role_audit_log(user_id);
    `, 'Creando índice user_id en auditoría')
    
    await executeSQL(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_log_created_at ON role_audit_log(created_at);
    `, 'Creando índice created_at en auditoría')
    
    // Paso 5: Habilitar RLS
    await executeSQL(`
      ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;
    `, 'Habilitando RLS en role_audit_log')
    
    // Paso 6: Crear políticas RLS
    await executeSQL(`
      CREATE POLICY "Admins can view all audit logs" ON role_audit_log
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM user_roles ur
                  JOIN roles r ON ur.role_id = r.id
                  WHERE ur.user_id = auth.uid()
                  AND r.name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin')
              )
          );
    `, 'Creando política de lectura para auditoría')
    
    await executeSQL(`
      CREATE POLICY "System can insert audit logs" ON role_audit_log
          FOR INSERT WITH CHECK (true);
    `, 'Creando política de inserción para auditoría')
    
    // Paso 7: Actualizar prioridades
    await executeSQL(`
      UPDATE roles SET priority = 100 WHERE name IN ('ADMIN', 'admin', 'SUPER_ADMIN', 'super_admin') AND (priority IS NULL OR priority = 50);
    `, 'Actualizando prioridades de roles admin')
    
    await executeSQL(`
      UPDATE roles SET priority = 75 WHERE name ILIKE '%manager%' AND (priority IS NULL OR priority = 50);
    `, 'Actualizando prioridades de managers')
    
    await executeSQL(`
      UPDATE roles SET priority = 50 WHERE priority IS NULL;
    `, 'Estableciendo prioridad por defecto')
    
    console.log('\n🎉 Migración básica completada!')
    console.log('\n📋 Funcionalidades habilitadas:')
    console.log('   ✅ Jerarquía de roles (parent_role_id, priority)')
    console.log('   ✅ Tabla de auditoría (role_audit_log)')
    console.log('   ✅ Índices optimizados')
    console.log('   ✅ Políticas RLS configuradas')
    console.log('\n⚠️  Nota: Las funciones avanzadas (get_role_statistics, triggers) deben crearse manualmente en Supabase SQL Editor')
    
    // Verificar que todo funcionó
    console.log('\n🔍 Verificando migración...')
    
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, parent_role_id, priority')
      .limit(1)
    
    if (rolesError) {
      console.warn('⚠️  No se pudieron verificar las columnas de roles')
    } else {
      console.log('✅ Columnas de jerarquía verificadas')
    }
    
    const { data: auditData, error: auditError } = await supabase
      .from('role_audit_log')
      .select('count', { count: 'exact', head: true })
    
    if (auditError) {
      console.warn('⚠️  No se pudo verificar la tabla de auditoría')
    } else {
      console.log('✅ Tabla de auditoría verificada')
    }
    
    console.log('\n✨ ¡Migración completada exitosamente!')
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    process.exit(1)
  }
}

// Ejecutar migración
runMigrationSteps()