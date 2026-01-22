import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuditResult {
    section: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    details?: any;
}

const results: AuditResult[] = [];

async function auditCashSessions() {
    console.log('\n📋 Auditing cash_sessions table...\n');

    // Check table exists and get actual columns
    try {
        const { data, error } = await supabase
            .from('cash_sessions')
            .select('*')
            .limit(1);

        if (error) {
            results.push({
                section: 'cash_sessions - Table Access',
                status: 'FAIL',
                message: `Cannot access table: ${error.message}`,
                details: error
            });
            return;
        }

        results.push({
            section: 'cash_sessions - Table Access',
            status: 'PASS',
            message: 'Table exists and is accessible'
        });

        // Show actual columns
        if (data && data.length > 0) {
            const actualColumns = Object.keys(data[0]);
            console.log('   📝 Actual columns:', actualColumns.join(', '));

            results.push({
                section: 'cash_sessions - Columns Found',
                status: 'PASS',
                message: `Found ${actualColumns.length} columns`,
                details: { columns: actualColumns }
            });
        } else {
            // Table is empty, query schema directly
            console.log('   ⚠️ Table is empty, checking schema...');

            results.push({
                section: 'cash_sessions - Columns',
                status: 'WARNING',
                message: 'Table is empty, cannot verify column structure from data'
            });
        }

    } catch (error: any) {
        results.push({
            section: 'cash_sessions - General',
            status: 'FAIL',
            message: `Unexpected error: ${error.message}`,
            details: error
        });
    }
}

async function auditCashMovements() {
    console.log('\n📋 Auditing cash_movements table...\n');

    try {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('*')
            .limit(1);

        if (error) {
            results.push({
                section: 'cash_movements - Table Access',
                status: 'FAIL',
                message: `Cannot access table: ${error.message}`,
                details: error
            });
            return;
        }

        results.push({
            section: 'cash_movements - Table Access',
            status: 'PASS',
            message: 'Table exists and is accessible'
        });

        // Check required columns
        const requiredColumns = [
            'id', 'session_id', 'type', 'amount', 'reason',
            'reference_type', 'reference_id', 'created_at',
            'updated_at', 'created_by'
        ];

        if (data && data.length > 0) {
            const actualColumns = Object.keys(data[0]);
            const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));

            if (missingColumns.length > 0) {
                results.push({
                    section: 'cash_movements - Columns',
                    status: 'FAIL',
                    message: `Missing columns: ${missingColumns.join(', ')}`,
                    details: { missing: missingColumns }
                });
            } else {
                results.push({
                    section: 'cash_movements - Columns',
                    status: 'PASS',
                    message: 'All required columns present'
                });
            }
        }

        // Test relationship query
        const { data: relationData, error: relationError } = await supabase
            .from('cash_movements')
            .select('id, session_id, cash_sessions!inner(id, session_status)')
            .limit(1);

        if (relationError) {
            results.push({
                section: 'cash_movements - Relationship',
                status: 'WARNING',
                message: `Relationship query issue: ${relationError.message}`,
                details: relationError
            });
        } else {
            results.push({
                section: 'cash_movements - Relationship',
                status: 'PASS',
                message: 'Foreign key relationship works'
            });
        }

    } catch (error: any) {
        results.push({
            section: 'cash_movements - General',
            status: 'FAIL',
            message: `Unexpected error: ${error.message}`,
            details: error
        });
    }
}

async function generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CASH DASHBOARD DATABASE AUDIT REPORT');
    console.log('='.repeat(60) + '\n');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARNING').length;

    results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} [${result.status}] ${result.section}`);
        console.log(`   ${result.message}`);
        if (result.details) {
            console.log(`   Details:`, JSON.stringify(result.details, null, 2));
        }
        console.log('');
    });

    console.log('='.repeat(60));
    console.log(`Summary: ${passCount} PASS | ${failCount} FAIL | ${warnCount} WARNING`);
    console.log('='.repeat(60) + '\n');

    if (failCount > 0) {
        console.log('❌ Audit FAILED - Please fix the issues above');
        process.exit(1);
    } else if (warnCount > 0) {
        console.log('⚠️ Audit PASSED with warnings');
        process.exit(0);
    } else {
        console.log('✅ Audit PASSED - All checks successful!');
        process.exit(0);
    }
}

async function runAudit() {
    console.log('🔍 Starting Cash Dashboard Database Audit...');

    await auditCashSessions();
    await auditCashMovements();
    await generateReport();
}

runAudit();
