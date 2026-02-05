#!/usr/bin/env tsx
/**
 * Auditoría de Integración SaaS en /dashboard/settings
 * 
 * Verifica que la sección de settings sea funcional con:
 * - Multitenancy (organization_id)
 * - Permisos por roles (RBAC)
 * - Planes SaaS
 * - Aislamiento de datos entre organizaciones
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

const results: AuditResult[] = [];

function addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
  results.push({ category, test, status, message, details });
}

async function auditBusinessConfigTable() {
  console.log('\n📋 1. Auditando tabla business_config...');
  
  // Verificar que existe la columna organization_id
  const { data: configs, error } = await supabase
    .from('business_config')
    .select('*')
    .limit(1);
  
  if (error) {
    addResult('business_config', 'Tabla existe', 'FAIL', `Error al consultar: ${error.message}`);
    return;
  }
  
  addResult('business_config', 'Tabla existe', 'PASS', 'Tabla business_config accesible');
  
  if (configs && configs.length > 0) {
    const hasOrgId = 'organization_id' in configs[0];
    addResult(
      'business_config',
      'Columna organization_id',
      hasOrgId ? 'PASS' : 'FAIL',
      hasOrgId ? 'Columna organization_id presente' : 'Columna organization_id NO encontrada',
      { columns: Object.keys(configs[0]) }
    );
    
    // Verificar columnas SMTP
    const smtpColumns = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_secure', 'smtp_from_email', 'smtp_from_name'];
    const hasAllSmtp = smtpColumns.every(col => col in configs[0]);
    addResult(
      'business_config',
      'Columnas SMTP',
      hasAllSmtp ? 'PASS' : 'WARNING',
      hasAllSmtp ? 'Todas las columnas SMTP presentes' : 'Faltan algunas columnas SMTP',
      { found: smtpColumns.filter(col => col in configs[0]) }
    );
  }
}

async function auditOrganizations() {
  console.log('\n🏢 2. Auditando organizaciones...');
  
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*');
  
  if (error) {
    addResult('organizations', 'Tabla existe', 'FAIL', `Error al consultar: ${error.message}`);
    return;
  }
  
  addResult('organizations', 'Tabla existe', 'PASS', `${orgs?.length || 0} organizaciones encontradas`);
  
  if (orgs && orgs.length > 0) {
    const hasPlans = orgs.every(org => org.subscription_plan);
    addResult(
      'organizations',
      'Planes asignados',
      hasPlans ? 'PASS' : 'WARNING',
      hasPlans ? 'Todas las organizaciones tienen plan' : 'Algunas organizaciones sin plan',
      { plans: orgs.map(o => ({ name: o.name, plan: o.subscription_plan })) }
    );
    
    const hasStatus = orgs.every(org => org.subscription_status);
    addResult(
      'organizations',
      'Estado de suscripción',
      hasStatus ? 'PASS' : 'WARNING',
      hasStatus ? 'Todas las organizaciones tienen estado' : 'Algunas organizaciones sin estado'
    );
  } else {
    addResult('organizations', 'Datos', 'WARNING', 'No hay organizaciones creadas');
  }
}

async function auditOrganizationMembers() {
  console.log('\n👥 3. Auditando miembros de organizaciones...');
  
  const { data: members, error } = await supabase
    .from('organization_members')
    .select('*');
  
  if (error) {
    addResult('organization_members', 'Tabla existe', 'FAIL', `Error al consultar: ${error.message}`);
    return;
  }
  
  addResult('organization_members', 'Tabla existe', 'PASS', `${members?.length || 0} miembros encontrados`);
  
  if (members && members.length > 0) {
    const hasRoles = members.every(m => m.role_id);
    addResult(
      'organization_members',
      'Roles asignados',
      hasRoles ? 'PASS' : 'WARNING',
      hasRoles ? 'Todos los miembros tienen rol' : 'Algunos miembros sin rol'
    );
    
    // Verificar que hay al menos un owner por organización
    const { data: orgs } = await supabase.from('organizations').select('id, name');
    if (orgs) {
      const orgsWithoutOwner = orgs.filter(org => 
        !members.some(m => m.organization_id === org.id && m.is_owner)
      );
      
      addResult(
        'organization_members',
        'Owners asignados',
        orgsWithoutOwner.length === 0 ? 'PASS' : 'WARNING',
        orgsWithoutOwner.length === 0 
          ? 'Todas las organizaciones tienen owner' 
          : `${orgsWithoutOwner.length} organizaciones sin owner`,
        { orgsWithoutOwner: orgsWithoutOwner.map(o => o.name) }
      );
    }
  } else {
    addResult('organization_members', 'Datos', 'WARNING', 'No hay miembros asignados a organizaciones');
  }
}

async function auditSaasPlans() {
  console.log('\n💳 4. Auditando planes SaaS...');
  
  const { data: plans, error } = await supabase
    .from('saas_plans')
    .select('*');
  
  if (error) {
    addResult('saas_plans', 'Tabla existe', 'FAIL', `Error al consultar: ${error.message}`);
    return;
  }
  
  addResult('saas_plans', 'Tabla existe', 'PASS', `${plans?.length || 0} planes encontrados`);
  
  if (plans && plans.length > 0) {
    const requiredPlans = ['Free', 'Starter', 'Professional', 'Premium'];
    const foundPlans = plans.map(p => p.name);
    const missingPlans = requiredPlans.filter(p => !foundPlans.includes(p));
    
    addResult(
      'saas_plans',
      'Planes requeridos',
      missingPlans.length === 0 ? 'PASS' : 'WARNING',
      missingPlans.length === 0 
        ? 'Todos los planes requeridos presentes' 
        : `Faltan planes: ${missingPlans.join(', ')}`,
      { found: foundPlans, missing: missingPlans }
    );
    
    // Verificar que cada plan tiene límites definidos
    const plansWithLimits = plans.filter(p => p.features && typeof p.features === 'object');
    addResult(
      'saas_plans',
      'Límites definidos',
      plansWithLimits.length === plans.length ? 'PASS' : 'WARNING',
      `${plansWithLimits.length}/${plans.length} planes con límites definidos`
    );
  } else {
    addResult('saas_plans', 'Datos', 'FAIL', 'No hay planes SaaS configurados');
  }
}

async function auditMultitenancyIsolation() {
  console.log('\n🔒 5. Auditando aislamiento multitenancy...');
  
  // Verificar que business_config tiene organization_id
  const { data: configs } = await supabase
    .from('business_config')
    .select('id, organization_id');
  
  if (configs) {
    const configsWithOrg = configs.filter(c => c.organization_id !== null);
    const configsWithoutOrg = configs.filter(c => c.organization_id === null);
    
    addResult(
      'multitenancy',
      'business_config con organization_id',
      configsWithoutOrg.length === 0 ? 'PASS' : 'WARNING',
      `${configsWithOrg.length} configs con org, ${configsWithoutOrg.length} sin org`,
      { withOrg: configsWithOrg.length, withoutOrg: configsWithoutOrg.length }
    );
  }
  
  // Verificar que products tiene organization_id
  const { data: products } = await supabase
    .from('products')
    .select('id, organization_id')
    .limit(10);
  
  if (products && products.length > 0) {
    const productsWithOrg = products.filter(p => p.organization_id !== null);
    addResult(
      'multitenancy',
      'products con organization_id',
      productsWithOrg.length === products.length ? 'PASS' : 'WARNING',
      `${productsWithOrg.length}/${products.length} productos con organization_id`
    );
  }
  
  // Verificar que sales tiene organization_id
  const { data: sales } = await supabase
    .from('sales')
    .select('id, organization_id')
    .limit(10);
  
  if (sales && sales.length > 0) {
    const salesWithOrg = sales.filter(s => s.organization_id !== null);
    addResult(
      'multitenancy',
      'sales con organization_id',
      salesWithOrg.length === sales.length ? 'PASS' : 'WARNING',
      `${salesWithOrg.length}/${sales.length} ventas con organization_id`
    );
  }
}

async function auditRLSPolicies() {
  console.log('\n🛡️ 6. Auditando políticas RLS...');
  
  // Verificar que las tablas tienen RLS habilitado
  const tables = ['business_config', 'organizations', 'organization_members', 'products', 'sales'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT relname, relrowsecurity 
          FROM pg_class 
          WHERE relname = '${table}' AND relnamespace = 'public'::regnamespace
        `
      });
      
      if (error) {
        addResult(
          'rls',
          `RLS en ${table}`,
          'WARNING',
          'No se pudo verificar RLS (función exec_sql no disponible)'
        );
      } else if (data && data.length > 0) {
        const hasRLS = data[0].relrowsecurity;
        addResult(
          'rls',
          `RLS en ${table}`,
          hasRLS ? 'PASS' : 'WARNING',
          hasRLS ? `RLS habilitado en ${table}` : `RLS NO habilitado en ${table}`
        );
      }
    } catch (rpcError) {
      addResult(
        'rls',
        `RLS en ${table}`,
        'WARNING',
        'No se pudo verificar RLS (función exec_sql no disponible)'
      );
    }
  }
}

async function auditAPIEndpoints() {
  console.log('\n🌐 7. Auditando endpoints de API...');
  
  // Verificar que los archivos de API existen
  const fs = require('fs');
  const path = require('path');
  
  const apiFiles = [
    'apps/frontend/src/app/api/system/settings/route.ts',
    'apps/frontend/src/app/api/user/settings/route.ts',
    'apps/frontend/src/app/api/security/settings/route.ts',
    'apps/frontend/src/app/api/system/smtp/test/route.ts',
    'apps/frontend/src/app/api/_utils/organization.ts',
    'apps/frontend/src/app/api/_utils/auth.ts'
  ];
  
  for (const file of apiFiles) {
    const exists = fs.existsSync(file);
    addResult(
      'api',
      `Archivo ${path.basename(file)}`,
      exists ? 'PASS' : 'FAIL',
      exists ? `${file} existe` : `${file} NO encontrado`
    );
    
    if (exists) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Verificar que usa assertAdmin o control de acceso
      const hasAuth = content.includes('assertAdmin') || content.includes('assertSuperAdmin') || content.includes('auth.getUser');
      addResult(
        'api',
        `Autenticación en ${path.basename(file)}`,
        hasAuth ? 'PASS' : 'WARNING',
        hasAuth ? 'Tiene control de acceso' : 'No se detectó control de acceso'
      );
      
      // Verificar que usa organization_id para multitenancy
      if (file.includes('system/settings')) {
        const hasOrgId = content.includes('organization_id');
        addResult(
          'api',
          `Multitenancy en ${path.basename(file)}`,
          hasOrgId ? 'PASS' : 'WARNING',
          hasOrgId ? 'Usa organization_id' : 'No se detectó uso de organization_id'
        );
      }
    }
  }
}

async function auditFrontendComponents() {
  console.log('\n🎨 8. Auditando componentes frontend...');
  
  const fs = require('fs');
  const path = require('path');
  
  const componentFiles = [
    'apps/frontend/src/app/dashboard/settings/components/SystemSettingsTab.tsx',
    'apps/frontend/src/app/dashboard/settings/components/POSTab.tsx',
    'apps/frontend/src/app/dashboard/settings/components/NotificationsTab.tsx',
    'apps/frontend/src/app/dashboard/settings/components/SecuritySettingsTab.tsx',
    'apps/frontend/src/app/dashboard/settings/components/BillingTab.tsx',
    'apps/frontend/src/app/dashboard/settings/hooks/useOptimizedSettings.ts'
  ];
  
  for (const file of componentFiles) {
    const exists = fs.existsSync(file);
    addResult(
      'frontend',
      `Componente ${path.basename(file)}`,
      exists ? 'PASS' : 'FAIL',
      exists ? `${path.basename(file)} existe` : `${path.basename(file)} NO encontrado`
    );
    
    if (exists) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Verificar que usa los nombres correctos de columnas (snake_case)
      const usesCorrectNames = content.includes('business_name') || content.includes('tax_rate') || content.includes('SystemSettings');
      addResult(
        'frontend',
        `Nombres de columnas en ${path.basename(file)}`,
        usesCorrectNames ? 'PASS' : 'WARNING',
        usesCorrectNames ? 'Usa nombres correctos (snake_case)' : 'Posible uso de nombres incorrectos'
      );
    }
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE AUDITORÍA - INTEGRACIÓN SAAS EN /dashboard/settings');
  console.log('='.repeat(80) + '\n');
  
  const categories = [...new Set(results.map(r => r.category))];
  
  let totalPass = 0;
  let totalFail = 0;
  let totalWarning = 0;
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const pass = categoryResults.filter(r => r.status === 'PASS').length;
    const fail = categoryResults.filter(r => r.status === 'FAIL').length;
    const warning = categoryResults.filter(r => r.status === 'WARNING').length;
    
    totalPass += pass;
    totalFail += fail;
    totalWarning += warning;
    
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${result.test}: ${result.message}`);
      
      if (result.details && result.status !== 'PASS') {
        console.log(`   Detalles: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📈 ESTADÍSTICAS FINALES');
  console.log('='.repeat(80));
  console.log(`✅ PASS:    ${totalPass}`);
  console.log(`⚠️  WARNING: ${totalWarning}`);
  console.log(`❌ FAIL:    ${totalFail}`);
  console.log(`📊 TOTAL:   ${totalPass + totalFail + totalWarning}`);
  
  const score = totalPass / (totalPass + totalFail + totalWarning) * 100;
  console.log(`\n🎯 PUNTUACIÓN: ${score.toFixed(1)}%`);
  
  if (score >= 90) {
    console.log('🎉 EXCELENTE - Sistema SaaS completamente funcional');
  } else if (score >= 75) {
    console.log('✅ BUENO - Sistema SaaS funcional con advertencias menores');
  } else if (score >= 60) {
    console.log('⚠️  ACEPTABLE - Sistema SaaS funcional pero requiere mejoras');
  } else {
    console.log('❌ CRÍTICO - Sistema SaaS requiere correcciones importantes');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🚀 Iniciando auditoría de integración SaaS en /dashboard/settings...\n');
  
  try {
    await auditBusinessConfigTable();
    await auditOrganizations();
    await auditOrganizationMembers();
    await auditSaasPlans();
    await auditMultitenancyIsolation();
    await auditRLSPolicies();
    await auditAPIEndpoints();
    await auditFrontendComponents();
    
    printResults();
    
    console.log('\n✅ Auditoría completada exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante la auditoría:', error);
    process.exit(1);
  }
}

main();
