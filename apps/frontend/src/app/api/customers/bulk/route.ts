import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRole } from '@/app/api/_utils/role-validation';
import { resolveCustomerOrganizationId } from '@/app/api/customers/_lib';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type SalesCustomerRow = {
  customer_id: string;
};

type ExportCustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  ruc: string | null;
  customer_code: string | null;
  customer_type: string | null;
  is_active: boolean | null;
  total_purchases: number | null;
  total_orders: number | null;
  last_purchase: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Customer Bulk Operations API - Phase 5 Optimization
 *
 * Handles bulk customer operations: activate, deactivate, delete, export
 * Optimized for performance with batch processing and proper error handling.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await authorizeCustomerBulkAction(request, body?.action);
    if (!auth.ok) {
      return NextResponse.json(auth.body, { status: auth.status });
    }

    const supabase = await createClient();
    const orgId = await resolveCustomerOrganizationId(request, auth.userRole);

    const { action, customerIds } = body;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Encabezado de organización faltante' },
        { status: 400 }
      );
    }

    if (!action || !customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una acción y al menos un cliente' },
        { status: 400 }
      );
    }

    if (customerIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Se pueden procesar máximo 100 clientes a la vez' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'activate':
        result = await bulkActivate(supabase, orgId, customerIds);
        break;
      case 'deactivate':
        result = await bulkDeactivate(supabase, orgId, customerIds);
        break;
      case 'delete':
        result = await bulkDelete(supabase, orgId, customerIds);
        break;
      case 'export':
        result = await bulkExport(supabase, orgId, customerIds);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Acción inválida. Acciones soportadas: activate, deactivate, delete, export' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in bulk customer operation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al realizar la operación masiva',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

async function authorizeCustomerBulkAction(request: NextRequest, action: unknown) {
  switch (action) {
    case 'activate':
    case 'deactivate':
      return validateRole(request, {
        roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']
      });
    case 'delete':
      return validateRole(request, {
        roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN']
      });
    case 'export':
      return validateRole(request, {
        roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN', 'MANAGER']
      });
    default:
      return validateRole(request, {
        roles: ['OWNER', 'ADMIN', 'SUPER_ADMIN']
      });
  }
}

async function bulkActivate(supabase: SupabaseClient, orgId: string, customerIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        is_active: true,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', orgId)
      .in('id', customerIds)
      .is('deleted_at', null)
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `${data?.length || 0} clientes activados correctamente`,
      data: {
        action: 'activate',
        processedCount: data?.length || 0,
        requestedCount: customerIds.length,
        processedCustomers: data || []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al activar clientes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function bulkDeactivate(supabase: SupabaseClient, orgId: string, customerIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        is_active: false,
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', orgId)
      .in('id', customerIds)
      .is('deleted_at', null)
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `${data?.length || 0} clientes desactivados correctamente`,
      data: {
        action: 'deactivate',
        processedCount: data?.length || 0,
        requestedCount: customerIds.length,
        processedCustomers: data || []
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al desactivar clientes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function bulkDelete(supabase: SupabaseClient, orgId: string, customerIds: string[]) {
  try {
    // Check which customers have sales history
    const { data: customersWithSales } = await supabase
      .from('sales')
      .select('customer_id')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .in('customer_id', customerIds);

    const customerIdsWithSales = new Set((customersWithSales as SalesCustomerRow[] | null)?.map((sale) => sale.customer_id) || []);
    const customersToDeactivate = customerIds.filter(id => customerIdsWithSales.has(id));
    const customersToDelete = customerIds.filter(id => !customerIdsWithSales.has(id));

    const results = {
      deactivated: 0,
      deleted: 0,
      errors: [] as string[]
    };

    // Soft delete (deactivate) customers with sales history
    if (customersToDeactivate.length > 0) {
      const { data: deactivatedData, error: deactivateError } = await supabase
        .from('customers')
        .update({
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', orgId)
        .in('id', customersToDeactivate)
        .is('deleted_at', null)
        .select('id, name');

      if (deactivateError) {
        results.errors.push(`Error al desactivar clientes: ${deactivateError.message}`);
      } else {
        results.deactivated = deactivatedData?.length || 0;
      }
    }

    // Hard delete customers without sales history
    if (customersToDelete.length > 0) {
      const { data: deletedData, error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('organization_id', orgId)
        .in('id', customersToDelete)
        .is('deleted_at', null)
        .select('id, name');

      if (deleteError) {
        results.errors.push(`Error al eliminar clientes: ${deleteError.message}`);
      } else {
        results.deleted = deletedData?.length || 0;
      }
    }

    const totalProcessed = results.deactivated + results.deleted;
    const hasErrors = results.errors.length > 0;

    return {
      success: !hasErrors || totalProcessed > 0,
      message: `Procesados ${totalProcessed} clientes: ${results.deleted} eliminados, ${results.deactivated} desactivados`,
      data: {
        action: 'delete',
        processedCount: totalProcessed,
        requestedCount: customerIds.length,
        deleted: results.deleted,
        deactivated: results.deactivated,
        errors: results.errors
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al eliminar clientes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function bulkExport(supabase: SupabaseClient, orgId: string, customerIds: string[]) {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        address,
        tax_id,
        ruc,
        customer_code,
        customer_type,
        is_active,
        total_purchases,
        total_orders,
        last_purchase,
        birth_date,
        notes,
        created_at,
        updated_at
      `)
      .eq('organization_id', orgId)
      .in('id', customerIds)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    if (!customers || customers.length === 0) {
      return {
        success: false,
        error: 'No se encontraron clientes para exportar'
      };
    }

    // Generate CSV content
    const headers = [
      'ID',
      'Nombre',
      'Email',
      'Teléfono',
      'Dirección',
      'NIF/CIF',
    'RUC',
      'Código de Cliente',
      'Tipo de Cliente',
      'Estado',
      'Total Gastado',
      'Total Órdenes',
      'Última Compra',
      'Fecha de Nacimiento',
      'Notas',
      'Creado el',
      'Actualizado el'
    ];

    const csvRows = (customers as ExportCustomerRow[]).map((customer) => [
      customer.id,
      `"${customer.name || ''}"`,
      customer.email || '',
      customer.phone || '',
      `"${customer.address || ''}"`,
      customer.tax_id || '',
    customer.ruc || '',
      customer.customer_code || '',
      customer.customer_type || '',
      customer.is_active ? 'Activo' : 'Inactivo',
      (customer.total_purchases || 0).toFixed(2),
      customer.total_orders || 0,
      customer.last_purchase || '',
      customer.birth_date || '',
      `"${customer.notes || ''}"`,
      customer.created_at || '',
      customer.updated_at || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row) => row.join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent;

    return {
      success: true,
      message: `${customers.length} clientes exportados correctamente`,
      data: {
        action: 'export',
        processedCount: customers.length,
        requestedCount: customerIds.length,
        csvContent: csvWithBOM,
        filename: `clientes_exportacion_${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv;charset=utf-8'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al exportar clientes',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
