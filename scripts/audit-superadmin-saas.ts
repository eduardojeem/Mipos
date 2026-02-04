import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface AuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  issue: string;
  recommendation: string;
}

const issues: AuditIssue[] = [];

function addIssue(issue: AuditIssue) {
  issues.push(issue);
}

async function auditDatabaseSchema() {
  console.log('🔍 1. AUDITING DATABASE SCHEMA...\n');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check required SaaS tables
  const requiredTables = [
    'organizations',
    'saas_plans',
    'saas_subscriptions',
    'users',
    'audit_logs'
  ];

  for (const table of requiredTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      addIssue({
        severity: 'critical',
        category: 'Database Schema',
        file: 'Database',
        issue: `Table '${table}' is missing or inaccessible`,
        recommendation: `Create the ${table} table with proper schema`
      });
      console.log(`❌ Table '${table}': MISSING`);
    } else {
      console.log(`✅ Table '${table}': EXISTS`);
    }
  }

  // Check organizations schema
  console.log('\n📋 Checking organizations schema...');
  const { data: orgs } = await supabase.from('organizations').select('*').limit(1);
  if (orgs && orgs[0]) {
    const orgColumns = Object.keys(orgs[0]);
    const requiredOrgColumns = ['id', 'name', 'subscription_plan', 'subscription_status', 'owner_id'];
    
    for (const col of requiredOrgColumns) {
      if (!orgColumns.includes(col)) {
        addIssue({
          severity: 'high',
          category: 'Database Schema',
          file: 'organizations table',
          issue: `Missing column: ${col}`,
          recommendation: `Add ${col} column to organizations table`
        });
        console.log(`❌ Column '${col}': MISSING`);
      } else {
        console.log(`✅ Column '${col}': EXISTS`);
      }
    }
  }

  // Check users schema
  console.log('\n📋 Checking users schema...');
  const { data: users } = await supabase.from('users').select('*').limit(1);
  if (users && users[0]) {
    const userColumns = Object.keys(users[0]);
    const requiredUserColumns = ['id', 'email', 'role'];
    
    for (const col of requiredUserColumns) {
      if (!userColumns.includes(col)) {
        addIssue({
          severity: 'high',
          category: 'Database Schema',
          file: 'users table',
          issue: `Missing column: ${col}`,
          recommendation: `Add ${col} column to users table`
        });
        console.log(`❌ Column '${col}': MISSING`);
      } else {
        console.log(`✅ Column '${col}': EXISTS`);
      }
    }

    // Check if organization_id exists (for multitenancy)
    if (!userColumns.includes('organization_id')) {
      addIssue({
        severity: 'medium',
        category: 'Multitenancy',
        file: 'users table',
        issue: 'Users table lacks organization_id for proper multitenancy',
        recommendation: 'Consider adding organization_id to users table or use a junction table'
      });
      console.log(`⚠️  Column 'organization_id': MISSING (multitenancy concern)`);
    }
  }
}

function auditAPIEndpoints() {
  console.log('\n\n🔍 2. AUDITING API ENDPOINTS...\n');

  const apiDir = 'apps/frontend/src/app/api/superadmin';
  const endpoints = [
    'analytics/route.ts',
    'audit-logs/route.ts',
    'organizations/route.ts',
    'plans/route.ts',
    'stats/route.ts',
    'users/route.ts',
    'subscriptions/route.ts'
  ];

  for (const endpoint of endpoints) {
    const filePath = path.join(apiDir, endpoint);
    
    if (!fs.existsSync(filePath)) {
      addIssue({
        severity: 'high',
        category: 'API Endpoints',
        file: endpoint,
        issue: 'Endpoint file not found',
        recommendation: `Create ${endpoint} endpoint`
      });
      console.log(`❌ ${endpoint}: NOT FOUND`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for authentication
    if (!content.includes('assertSuperAdmin') && !content.includes('checkSuperAdmin')) {
      addIssue({
        severity: 'critical',
        category: 'Security',
        file: endpoint,
        issue: 'Missing super admin authentication check',
        recommendation: 'Add assertSuperAdmin() check at the beginning of the endpoint'
      });
      console.log(`❌ ${endpoint}: MISSING AUTH CHECK`);
    } else {
      console.log(`✅ ${endpoint}: HAS AUTH CHECK`);
    }

    // Check for error handling
    if (!content.includes('try') || !content.includes('catch')) {
      addIssue({
        severity: 'medium',
        category: 'Error Handling',
        file: endpoint,
        issue: 'Missing try-catch error handling',
        recommendation: 'Wrap endpoint logic in try-catch block'
      });
      console.log(`⚠️  ${endpoint}: MISSING ERROR HANDLING`);
    } else {
      console.log(`✅ ${endpoint}: HAS ERROR HANDLING`);
    }

    // Check for wrong table names (common mistakes)
    const wrongTableNames = [
      { wrong: 'subscription_plans', correct: 'saas_plans' },
      { wrong: 'subscriptions', correct: 'saas_subscriptions' },
      { wrong: "'plans'", correct: 'saas_plans' }
    ];

    for (const { wrong, correct } of wrongTableNames) {
      if (content.includes(wrong)) {
        addIssue({
          severity: 'high',
          category: 'Database Queries',
          file: endpoint,
          issue: `Using wrong table name: ${wrong}`,
          recommendation: `Replace ${wrong} with ${correct}`
        });
        console.log(`❌ ${endpoint}: USES WRONG TABLE NAME '${wrong}'`);
      }
    }
  }
}

function auditFrontendComponents() {
  console.log('\n\n🔍 3. AUDITING FRONTEND COMPONENTS...\n');

  const componentsDir = 'apps/frontend/src/app/superadmin';
  const criticalFiles = [
    'layout.tsx',
    'page.tsx',
    'components/SuperAdminGuard.tsx',
    'hooks/useAdminData.ts',
    'hooks/useAnalytics.ts'
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(componentsDir, file);
    
    if (!fs.existsSync(filePath)) {
      addIssue({
        severity: 'high',
        category: 'Frontend',
        file: file,
        issue: 'Critical file not found',
        recommendation: `Create ${file}`
      });
      console.log(`❌ ${file}: NOT FOUND`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check for proper loading states
    if (file.includes('page.tsx') || file.includes('hooks/')) {
      if (!content.includes('loading') && !content.includes('isLoading')) {
        addIssue({
          severity: 'low',
          category: 'UX',
          file: file,
          issue: 'Missing loading state',
          recommendation: 'Add loading state for better UX'
        });
        console.log(`⚠️  ${file}: MISSING LOADING STATE`);
      } else {
        console.log(`✅ ${file}: HAS LOADING STATE`);
      }
    }

    // Check for error handling
    if (file.includes('page.tsx') || file.includes('hooks/')) {
      if (!content.includes('error') && !content.includes('Error')) {
        addIssue({
          severity: 'medium',
          category: 'Error Handling',
          file: file,
          issue: 'Missing error handling',
          recommendation: 'Add error state and display'
        });
        console.log(`⚠️  ${file}: MISSING ERROR HANDLING`);
      } else {
        console.log(`✅ ${file}: HAS ERROR HANDLING`);
      }
    }

    // Check SuperAdminGuard
    if (file === 'layout.tsx') {
      if (!content.includes('SuperAdminGuard')) {
        addIssue({
          severity: 'critical',
          category: 'Security',
          file: file,
          issue: 'Layout missing SuperAdminGuard protection',
          recommendation: 'Wrap layout content with SuperAdminGuard component'
        });
        console.log(`❌ ${file}: MISSING SUPERADMIN GUARD`);
      } else {
        console.log(`✅ ${file}: HAS SUPERADMIN GUARD`);
      }
    }
  }
}

async function auditRLSPolicies() {
  console.log('\n\n🔍 4. AUDITING RLS POLICIES...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if RLS is enabled on critical tables
  const criticalTables = ['organizations', 'saas_plans', 'saas_subscriptions', 'audit_logs'];

  for (const table of criticalTables) {
    // Try to query as anonymous user (should fail if RLS is properly set)
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await anonSupabase.from(table).select('*').limit(1);

    if (!error && data && data.length > 0) {
      addIssue({
        severity: 'critical',
        category: 'Security - RLS',
        file: `${table} table`,
        issue: 'RLS not properly configured - anonymous users can read data',
        recommendation: `Enable RLS and create proper policies for ${table} table`
      });
      console.log(`❌ ${table}: RLS NOT PROPERLY CONFIGURED`);
    } else if (error && error.code === 'PGRST301') {
      console.log(`✅ ${table}: RLS ENABLED (no anonymous access)`);
    } else {
      console.log(`⚠️  ${table}: Unable to verify RLS (${error?.message || 'unknown'})`);
    }
  }
}

function auditMultitenancy() {
  console.log('\n\n🔍 5. AUDITING MULTITENANCY IMPLEMENTATION...\n');

  const apiDir = 'apps/frontend/src/app/api/superadmin';
  const endpoints = [
    'organizations/route.ts',
    'users/route.ts',
    'subscriptions/route.ts'
  ];

  for (const endpoint of endpoints) {
    const filePath = path.join(apiDir, endpoint);
    
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if queries filter by organization_id
    if (endpoint !== 'organizations/route.ts') {
      if (!content.includes('organization_id') && !content.includes('org_id')) {
        addIssue({
          severity: 'high',
          category: 'Multitenancy',
          file: endpoint,
          issue: 'Queries may not be filtering by organization',
          recommendation: 'Ensure all queries include organization_id filter where appropriate'
        });
        console.log(`⚠️  ${endpoint}: MAY NOT FILTER BY ORGANIZATION`);
      } else {
        console.log(`✅ ${endpoint}: INCLUDES ORGANIZATION FILTERING`);
      }
    }
  }
}

function generateReport() {
  console.log('\n\n📊 AUDIT REPORT\n');
  console.log('='.repeat(80));

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');

  console.log(`\n🔴 CRITICAL ISSUES: ${criticalIssues.length}`);
  criticalIssues.forEach(issue => {
    console.log(`\n  File: ${issue.file}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Fix: ${issue.recommendation}`);
  });

  console.log(`\n🟠 HIGH PRIORITY ISSUES: ${highIssues.length}`);
  highIssues.forEach(issue => {
    console.log(`\n  File: ${issue.file}`);
    console.log(`  Issue: ${issue.issue}`);
    console.log(`  Fix: ${issue.recommendation}`);
  });

  console.log(`\n🟡 MEDIUM PRIORITY ISSUES: ${mediumIssues.length}`);
  mediumIssues.forEach(issue => {
    console.log(`\n  File: ${issue.file}`);
    console.log(`  Issue: ${issue.issue}`);
  });

  console.log(`\n🟢 LOW PRIORITY ISSUES: ${lowIssues.length}`);

  console.log('\n' + '='.repeat(80));
  console.log(`\nTOTAL ISSUES: ${issues.length}`);
  
  // Generate markdown report
  const reportPath = 'SUPERADMIN_SAAS_AUDIT_REPORT.md';
  let markdown = `# SuperAdmin SaaS Audit Report\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- 🔴 Critical Issues: ${criticalIssues.length}\n`;
  markdown += `- 🟠 High Priority: ${highIssues.length}\n`;
  markdown += `- 🟡 Medium Priority: ${mediumIssues.length}\n`;
  markdown += `- 🟢 Low Priority: ${lowIssues.length}\n`;
  markdown += `- **Total**: ${issues.length}\n\n`;

  const categories = ['Security', 'Database Schema', 'Multitenancy', 'API Endpoints', 'Error Handling', 'Frontend', 'UX', 'Security - RLS', 'Database Queries'];
  
  for (const category of categories) {
    const categoryIssues = issues.filter(i => i.category === category);
    if (categoryIssues.length === 0) continue;

    markdown += `## ${category}\n\n`;
    
    for (const issue of categoryIssues) {
      const emoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢';
      markdown += `### ${emoji} ${issue.file}\n\n`;
      markdown += `**Severity**: ${issue.severity.toUpperCase()}\n\n`;
      markdown += `**Issue**: ${issue.issue}\n\n`;
      markdown += `**Recommendation**: ${issue.recommendation}\n\n`;
      markdown += `---\n\n`;
    }
  }

  fs.writeFileSync(reportPath, markdown);
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

async function runAudit() {
  console.log('🚀 STARTING SUPERADMIN SAAS AUDIT\n');
  console.log('='.repeat(80));

  try {
    await auditDatabaseSchema();
    auditAPIEndpoints();
    auditFrontendComponents();
    await auditRLSPolicies();
    auditMultitenancy();
    generateReport();

    console.log('\n✅ Audit completed successfully!');
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
  }
}

runAudit();
