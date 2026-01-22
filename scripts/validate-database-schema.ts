#!/usr/bin/env tsx

/**
 * Script de Validación del Esquema de Base de Datos
 * 
 * Este script verifica que todas las tablas, índices, restricciones
 * y datos iniciales se hayan creado correctamente en Supabase.
 * 
 * Uso: npm run validate-schema
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Configuración de colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class DatabaseValidator {
  private prisma: PrismaClient;
  private supabase: any;
  private results: ValidationResult[] = [];

  constructor() {
    this.prisma = new PrismaClient();
    
    // Inicializar Supabase si las variables están disponibles
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  private log(message: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  private addResult(category: string, test: string, passed: boolean, message: string, details?: any) {
    this.results.push({ category, test, passed, message, details });
  }

  /**
   * Validar que todas las tablas principales existan
   */
  async validateTables(): Promise<void> {
    this.log('\n🔍 Validando existencia de tablas...', 'cyan');

    const expectedTables = [
      'users', 'roles', 'permissions', 'role_permissions', 'user_roles',
      'user_sessions', 'role_audit_logs', 'categories', 'products',
      'suppliers', 'purchases', 'purchase_items', 'inventory_movements',
      'customers', 'sales', 'sale_items', 'returns', 'return_items'
    ];

    try {
      // Consulta para obtener todas las tablas
      const result = await this.prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;

      const existingTables = result.map(row => row.table_name);
      
      for (const table of expectedTables) {
        const exists = existingTables.includes(table);
        this.addResult(
          'Tablas',
          `Tabla ${table}`,
          exists,
          exists ? `✅ Tabla ${table} existe` : `❌ Tabla ${table} no encontrada`,
          { expectedTables: expectedTables.length, foundTables: existingTables.length }
        );
      }

      this.log(`📊 Tablas encontradas: ${existingTables.length}/${expectedTables.length}`, 'blue');
      
    } catch (error) {
      this.addResult('Tablas', 'Consulta de tablas', false, `❌ Error al consultar tablas: ${error}`, error);
    }
  }

  /**
   * Validar que los índices estén creados
   */
  async validateIndexes(): Promise<void> {
    this.log('\n🔍 Validando índices...', 'cyan');

    try {
      const result = await this.prisma.$queryRaw<Array<{ indexname: string, tablename: string }>>`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
      `;

      const expectedIndexPatterns = [
        'idx_users_email',
        'idx_products_sku',
        'idx_sales_date',
        'idx_role_permissions_role_id',
        'idx_user_roles_user_id'
      ];

      const foundIndexes = result.map(row => row.indexname);
      
      for (const pattern of expectedIndexPatterns) {
        const found = foundIndexes.some(index => index.includes(pattern.replace('idx_', '')));
        this.addResult(
          'Índices',
          `Índice ${pattern}`,
          found,
          found ? `✅ Índice ${pattern} encontrado` : `⚠️ Índice ${pattern} no encontrado`
        );
      }

      this.log(`📈 Índices encontrados: ${foundIndexes.length}`, 'blue');
      
    } catch (error) {
      this.addResult('Índices', 'Consulta de índices', false, `❌ Error al consultar índices: ${error}`, error);
    }
  }

  /**
   * Validar restricciones de clave foránea
   */
  async validateForeignKeys(): Promise<void> {
    this.log('\n🔍 Validando claves foráneas...', 'cyan');

    try {
      const result = await this.prisma.$queryRaw<Array<{ 
        table_name: string, 
        constraint_name: string,
        constraint_type: string 
      }>>`
        SELECT table_name, constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        ORDER BY table_name
      `;

      const expectedForeignKeys = [
        'fk_products_category',
        'fk_sales_user',
        'fk_sale_items_sale',
        'fk_user_roles_user',
        'fk_role_permissions_role'
      ];

      const foundConstraints = result.map(row => row.constraint_name);
      
      for (const fk of expectedForeignKeys) {
        const found = foundConstraints.some(constraint => constraint.includes(fk.replace('fk_', '')));
        this.addResult(
          'Claves Foráneas',
          `FK ${fk}`,
          found,
          found ? `✅ Clave foránea ${fk} encontrada` : `⚠️ Clave foránea ${fk} no encontrada`
        );
      }

      this.log(`🔗 Claves foráneas encontradas: ${foundConstraints.length}`, 'blue');
      
    } catch (error) {
      this.addResult('Claves Foráneas', 'Consulta de FK', false, `❌ Error al consultar claves foráneas: ${error}`, error);
    }
  }

  /**
   * Validar datos iniciales del sistema
   */
  async validateInitialData(): Promise<void> {
    this.log('\n🔍 Validando datos iniciales...', 'cyan');

    try {
      // Validar roles del sistema
      const roles = await this.prisma.role.findMany({
        where: { isSystemRole: true }
      });

      const expectedRoles = ['ADMIN', 'CASHIER', 'MANAGER', 'VIEWER'];
      const foundRoles = roles.map(role => role.name);

      for (const roleName of expectedRoles) {
        const found = foundRoles.includes(roleName);
        this.addResult(
          'Datos Iniciales',
          `Rol ${roleName}`,
          found,
          found ? `✅ Rol ${roleName} creado` : `❌ Rol ${roleName} no encontrado`
        );
      }

      // Validar permisos básicos
      const permissions = await this.prisma.permission.findMany();
      const expectedPermissionCount = 15; // Número aproximado de permisos básicos

      this.addResult(
        'Datos Iniciales',
        'Permisos básicos',
        permissions.length >= expectedPermissionCount,
        `${permissions.length >= expectedPermissionCount ? '✅' : '⚠️'} Permisos encontrados: ${permissions.length}`,
        { expected: expectedPermissionCount, found: permissions.length }
      );

      // Validar asignación de permisos al rol ADMIN
      const adminRole = await this.prisma.role.findFirst({
        where: { name: 'ADMIN' },
        include: { permissions: true }
      });

      if (adminRole) {
        const adminPermissions = adminRole.permissions.length;
        this.addResult(
          'Datos Iniciales',
          'Permisos de ADMIN',
          adminPermissions > 0,
          `${adminPermissions > 0 ? '✅' : '❌'} Permisos asignados a ADMIN: ${adminPermissions}`
        );
      }

    } catch (error) {
      this.addResult('Datos Iniciales', 'Consulta de datos', false, `❌ Error al validar datos iniciales: ${error}`, error);
    }
  }

  /**
   * Validar funciones auxiliares
   */
  async validateFunctions(): Promise<void> {
    this.log('\n🔍 Validando funciones auxiliares...', 'cyan');

    const expectedFunctions = [
      'is_admin',
      'has_permission',
      'current_user_id',
      'update_updated_at_column'
    ];

    try {
      const result = await this.prisma.$queryRaw<Array<{ routine_name: string }>>`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name
      `;

      const foundFunctions = result.map(row => row.routine_name);

      for (const funcName of expectedFunctions) {
        const found = foundFunctions.includes(funcName);
        this.addResult(
          'Funciones',
          `Función ${funcName}`,
          found,
          found ? `✅ Función ${funcName} existe` : `❌ Función ${funcName} no encontrada`
        );
      }

      this.log(`⚙️ Funciones encontradas: ${foundFunctions.length}`, 'blue');

    } catch (error) {
      this.addResult('Funciones', 'Consulta de funciones', false, `❌ Error al consultar funciones: ${error}`, error);
    }
  }

  /**
   * Validar triggers
   */
  async validateTriggers(): Promise<void> {
    this.log('\n🔍 Validando triggers...', 'cyan');

    try {
      const result = await this.prisma.$queryRaw<Array<{ 
        trigger_name: string, 
        event_object_table: string 
      }>>`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `;

      const expectedTriggerTables = ['users', 'roles', 'products', 'sales'];
      const foundTriggerTables = [...new Set(result.map(row => row.event_object_table))];

      for (const table of expectedTriggerTables) {
        const found = foundTriggerTables.includes(table);
        this.addResult(
          'Triggers',
          `Trigger en ${table}`,
          found,
          found ? `✅ Trigger en tabla ${table}` : `⚠️ Trigger en tabla ${table} no encontrado`
        );
      }

      this.log(`🔄 Triggers encontrados: ${result.length}`, 'blue');

    } catch (error) {
      this.addResult('Triggers', 'Consulta de triggers', false, `❌ Error al consultar triggers: ${error}`, error);
    }
  }

  /**
   * Generar reporte final
   */
  generateReport(): void {
    this.log('\n📋 REPORTE DE VALIDACIÓN DEL ESQUEMA', 'bright');
    this.log('='.repeat(50), 'bright');

    const categories = [...new Set(this.results.map(r => r.category))];
    let totalTests = 0;
    let passedTests = 0;

    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      const categoryTotal = categoryResults.length;

      this.log(`\n📂 ${category}:`, 'yellow');
      
      for (const result of categoryResults) {
        const icon = result.passed ? '✅' : '❌';
        const color = result.passed ? 'green' : 'red';
        this.log(`  ${icon} ${result.test}: ${result.message}`, color);
      }

      this.log(`  📊 Resultado: ${categoryPassed}/${categoryTotal} pruebas pasaron`, 'blue');
      
      totalTests += categoryTotal;
      passedTests += categoryPassed;
    }

    // Resumen final
    this.log('\n🎯 RESUMEN FINAL:', 'bright');
    this.log(`✅ Pruebas exitosas: ${passedTests}`, 'green');
    this.log(`❌ Pruebas fallidas: ${totalTests - passedTests}`, 'red');
    this.log(`📊 Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'cyan');

    if (passedTests === totalTests) {
      this.log('\n🎉 ¡VALIDACIÓN COMPLETADA EXITOSAMENTE!', 'green');
      this.log('✨ El esquema de base de datos está correctamente configurado.', 'green');
    } else {
      this.log('\n⚠️ VALIDACIÓN INCOMPLETA', 'yellow');
      this.log('🔧 Revisa los errores anteriores y ejecuta el script SQL nuevamente.', 'yellow');
    }
  }

  /**
   * Ejecutar todas las validaciones
   */
  async runAllValidations(): Promise<void> {
    this.log('🚀 Iniciando validación del esquema de base de datos...', 'bright');
    
    try {
      await this.validateTables();
      await this.validateIndexes();
      await this.validateForeignKeys();
      await this.validateInitialData();
      await this.validateFunctions();
      await this.validateTriggers();
      
      this.generateReport();
      
    } catch (error) {
      this.log(`\n❌ Error durante la validación: ${error}`, 'red');
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Función principal
async function main() {
  const validator = new DatabaseValidator();
  await validator.runAllValidations();
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

export default DatabaseValidator;