import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import {
  buildCustomerSummary,
  resolveCustomerOrganizationId,
} from '@/app/api/customers/_lib';

/**
 * Customer Summary API - Phase 5 Optimization
 * 
 * Provides lightweight customer statistics and metrics for dashboard display.
 * Optimized for performance with server-side calculations and minimal data transfer.
 */

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRole(request, {
      roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CASHIER']
    });
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();

    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);
    console.log('[Customers Summary API] Organization ID:', orgId);
    if (!orgId) {
      console.error('[Customers Summary API] ❌ Organization ID header missing');
      return NextResponse.json({ success: false, error: 'Encabezado de organización faltante' }, { status: 400 });
    }

    const { data: customerMetrics, error } = await supabase
      .from('customers')
      .select('customer_type, is_active, total_purchases, total_orders, created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message);
    }

    const summary = buildCustomerSummary(customerMetrics || []);

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Error fetching customer summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el resumen de clientes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
