import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/pos/sales - Process a new sale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      customer_id,
      discount_amount = 0,
      tax_amount = 0,
      discount_type = 'FIXED_AMOUNT',
      payment_method = 'CASH',
      sale_type = 'RETAIL',
      notes = '',
      total_amount,
      transfer_reference,
      cashReceived,
      change
    } = body;

    // Validate required fields
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (!total_amount || total_amount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Start transaction by creating the sale first
    const saleData = {
      customer_id: customer_id || null,
      total_amount: Number(total_amount),
      discount_amount: Number(discount_amount),
      tax_amount: Number(tax_amount),
      discount_type,
      payment_method,
      sale_type,
      notes,
      status: 'completed',
      created_at: new Date().toISOString(),
      // Add payment-specific fields
      ...(transfer_reference && { transfer_reference }),
      ...(cashReceived !== undefined && { cash_received: Number(cashReceived) }),
      ...(change !== undefined && { change_amount: Number(change) })
    };

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert(saleData)
      .select()
      .single();

    if (saleError) throw saleError;

    // Prepare sale items with the sale ID
    const saleItems = items.map((item: any) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.unit_price) * Number(item.quantity),
      discount_amount: Number(item.discount_amount || 0)
    }));

    // Insert sale items
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      // Rollback: delete the sale if items insertion fails
      await supabase.from('sales').delete().eq('id', sale.id);
      throw itemsError;
    }

    // Update product stock quantities
    const stockUpdates = items.map((item: any) => ({
      id: item.product_id,
      quantity: Number(item.quantity)
    }));

    // Batch update stock using RPC function (if available) or individual updates
    for (const update of stockUpdates) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: update.id,
        quantity_sold: update.quantity
      });

      // If RPC fails, try direct update
      if (stockError) {
        console.warn('RPC stock update failed, using direct update:', stockError);
        
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', update.id)
          .single();

        if (product) {
          const newStock = Math.max(0, (product.stock_quantity || 0) - update.quantity);
          await supabase
            .from('products')
            .update({ 
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', update.id);
        }
      }
    }

    // Generate sale number for display
    const saleNumber = `POS-${sale.id.slice(-8).toUpperCase()}`;

    // Sync to external SaaS (outbound)
    try {
      const origin = new URL(request.url).origin;
      const salePayload = {
        id: sale.id,
        total: Number(total_amount),
        discount: Number(discount_amount || 0),
        tax: Number(tax_amount || 0),
        payment_method,
        sale_type,
        customer_id: customer_id || null,
        notes,
        created_at: sale.created_at,
        items: saleItems.map((si: any) => ({
          product_id: si.product_id,
          quantity: si.quantity,
          unit_price: si.unit_price,
          total_price: si.total_price,
          discount_amount: si.discount_amount || 0
        }))
      };
      await fetch(`${origin}/api/external-sync/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [salePayload] })
      });
    } catch {}

    // Fetch complete sale data with items for response
    const { data: completeSale } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          products (
            id,
            name,
            sku
          )
        ),
        customers (
          id,
          name,
          email
        )
      `)
      .eq('id', sale.id)
      .single();

    return NextResponse.json({
      success: true,
      sale: completeSale || sale,
      saleNumber,
      message: 'Sale processed successfully',
      metadata: {
        itemsCount: items.length,
        totalAmount: total_amount,
        paymentMethod: payment_method,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process sale error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process sale',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/pos/sales - Get recent sales for POS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status') || 'completed';

    const supabase = await createClient();

    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        total_amount,
        payment_method,
        created_at,
        status,
        customers (
          name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const transformedSales = (sales || []).map((sale: any) => ({
      id: sale.id,
      total_amount: sale.total_amount,
      payment_method: sale.payment_method,
      created_at: sale.created_at,
      status: sale.status,
      customer_name: sale.customers?.name || 'Cliente General',
      saleNumber: `POS-${sale.id.slice(-8).toUpperCase()}`
    }));

    return NextResponse.json({
      sales: transformedSales,
      total: transformedSales.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get POS sales error:', error);
    
    return NextResponse.json({
      sales: [],
      total: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch sales'
    });
  }
}
