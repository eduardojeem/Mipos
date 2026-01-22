import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const supplierId = searchParams.get('supplierId');
    const productId = searchParams.get('productId');
    const dateRange = searchParams.get('dateRange'); // days
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    // Build query
    let query = supabase
      .from('product_price_history')
      .select(`
        *,
        product:products (id, name),
        supplier:suppliers (id, name)
      `, { count: 'exact' });

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (dateRange) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(dateRange));
      query = query.gte('effective_date', date.toISOString());
    }

    // Apply search filter if needed (this is tricky with joins, doing simple implementation)
    // For proper search across joined tables, we might need a different approach or rely on client-side filtering for small datasets
    // or use a view/function. For now, we skip deep search in this basic query or assume exact matches on ID if passed.
    
    // Order by date
    query = query.order('effective_date', { ascending: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      // If table doesn't exist yet, return empty structure
      if (error.code === '42P01') {
        return NextResponse.json({ 
          items: [], 
          total: 0,
          trends: [],
          stats: { avgChange: 0, totalEntries: 0, activeAlerts: 0, monitoredProducts: 0 }
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform items
    const items = data?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product?.name || 'Unknown Product',
      supplierId: item.supplier_id,
      supplierName: item.supplier?.name || 'Unknown Supplier',
      price: item.price,
      currency: item.currency,
      effectiveDate: item.effective_date,
      source: item.source,
      documentRef: item.document_ref,
      notes: item.notes,
      status: item.status,
      changeType: 'stable', // Logic to calculate this could be complex, simplifying for now or it should be stored
      changePercentage: 0, // Should be calculated or stored
      unit: item.unit,
      minOrderQuantity: item.min_order_quantity
    })) || [];

    // Calculate trends and stats (Mocking for now as it requires aggregation queries)
    // In a real implementation, we would run separate aggregation queries
    const stats = {
      avgChange: 2.5, // Mock
      totalEntries: count || 0,
      activeAlerts: 0, // Would need another query
      monitoredProducts: new Set(items.map((i: any) => i.productId)).size
    };

    const trends = [
      { period: 'Jan', avgPrice: 100, minPrice: 90, maxPrice: 110, supplierCount: 2 },
      { period: 'Feb', avgPrice: 105, minPrice: 95, maxPrice: 115, supplierCount: 3 }
    ]; // Mock trends

    return NextResponse.json({
      items,
      total: count,
      trends,
      stats
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieStore = await cookies();
    const supabase = await createServerClient(cookieStore);

    // Basic validation
    if (!body.productId || !body.supplierId || !body.price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_price_history')
      .insert({
        product_id: body.productId,
        supplier_id: body.supplierId,
        price: body.price,
        currency: body.currency || 'MXN',
        effective_date: body.effectiveDate || new Date().toISOString(),
        source: body.source || 'manual',
        document_ref: body.documentRef,
        notes: body.notes,
        status: body.status || 'active',
        unit: body.unit || 'unit',
        min_order_quantity: body.minOrderQuantity
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
