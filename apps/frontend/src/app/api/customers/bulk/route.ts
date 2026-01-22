import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Customer Bulk Operations API - Phase 5 Optimization
 * 
 * Handles bulk customer operations: activate, deactivate, delete, export
 * Optimized for performance with batch processing and proper error handling.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    
    const { action, customerIds } = body;

    if (!action || !customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action and customer IDs are required' },
        { status: 400 }
      );
    }

    // Limit bulk operations to prevent abuse
    if (customerIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 customers can be processed at once' },
        { status: 400 }
      );
    }

    let result;
    switch (action) {
      case 'activate':
        result = await bulkActivate(supabase, customerIds);
        break;
      case 'deactivate':
        result = await bulkDeactivate(supabase, customerIds);
        break;
      case 'delete':
        result = await bulkDelete(supabase, customerIds);
        break;
      case 'export':
        result = await bulkExport(supabase, customerIds);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: activate, deactivate, delete, export' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in bulk customer operation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function bulkActivate(supabase: any, customerIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .in('id', customerIds)
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `${data?.length || 0} customers activated successfully`,
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
      error: 'Failed to activate customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function bulkDeactivate(supabase: any, customerIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .in('id', customerIds)
      .select('id, name');

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: `${data?.length || 0} customers deactivated successfully`,
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
      error: 'Failed to deactivate customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function bulkDelete(supabase: any, customerIds: string[]) {
  try {
    // Check which customers have sales history
    const { data: customersWithSales } = await supabase
      .from('sales')
      .select('customer_id')
      .in('customer_id', customerIds);

    const customerIdsWithSales = new Set(customersWithSales?.map((s: any) => s.customer_id) || []);
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
          updated_at: new Date().toISOString()
        })
        .in('id', customersToDeactivate)
        .select('id, name');

      if (deactivateError) {
        results.errors.push(`Failed to deactivate customers: ${deactivateError.message}`);
      } else {
        results.deactivated = deactivatedData?.length || 0;
      }
    }

    // Hard delete customers without sales history
    if (customersToDelete.length > 0) {
      const { data: deletedData, error: deleteError } = await supabase
        .from('customers')
        .delete()
        .in('id', customersToDelete)
        .select('id, name');

      if (deleteError) {
        results.errors.push(`Failed to delete customers: ${deleteError.message}`);
      } else {
        results.deleted = deletedData?.length || 0;
      }
    }

    const totalProcessed = results.deactivated + results.deleted;
    const hasErrors = results.errors.length > 0;

    return {
      success: !hasErrors || totalProcessed > 0,
      message: `Processed ${totalProcessed} customers: ${results.deleted} deleted, ${results.deactivated} deactivated`,
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
      error: 'Failed to delete customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function bulkExport(supabase: any, customerIds: string[]) {
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
      .in('id', customerIds)
      .order('name');

    if (error) {
      throw new Error(error.message);
    }

    if (!customers || customers.length === 0) {
      return {
        success: false,
        error: 'No customers found for export'
      };
    }

    // Generate CSV content
    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Address',
      'Tax ID',
      'Customer Code',
      'Customer Type',
      'Status',
      'Total Spent',
      'Total Orders',
      'Last Purchase',
      'Birth Date',
      'Notes',
      'Created At',
      'Updated At'
    ];

    const csvRows = customers.map((customer: any) => [
      customer.id,
      `"${customer.name || ''}"`,
      customer.email || '',
      customer.phone || '',
      `"${customer.address || ''}"`,
      customer.tax_id || '',
      customer.customer_code || '',
      customer.customer_type || '',
      customer.is_active ? 'Active' : 'Inactive',
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
      ...csvRows.map((row: any[]) => row.join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const csvWithBOM = '\ufeff' + csvContent;

    return {
      success: true,
      message: `${customers.length} customers exported successfully`,
      data: {
        action: 'export',
        processedCount: customers.length,
        requestedCount: customerIds.length,
        csvContent: csvWithBOM,
        filename: `customers_export_${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv;charset=utf-8'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to export customers',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Batch processing helper for large operations
async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<any>
): Promise<any[]> {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const result = await processor(batch);
      results.push(result);
    } catch (error) {
      console.error(`Error processing batch ${i / batchSize + 1}:`, error);
      results.push({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
  
  return results;
}
