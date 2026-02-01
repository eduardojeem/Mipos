import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 for performance
    const userId = searchParams.get('user_id');

    const supabase = await createClient();

    let query = supabase
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
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Fetch recent sales with customer info
    const { data: sales, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data for frontend
    const transformedSales = (sales || []).map((sale: any) => ({
      id: sale.id,
      total_amount: sale.total_amount || 0,
      payment_method: sale.payment_method || 'unknown',
      created_at: sale.created_at,
      status: sale.status,
      customer_name: (sale.customers as any)?.name || null
    }));

    return NextResponse.json({
      sales: transformedSales,
      total: count || 0,
      limit,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recent sales error:', error);
    
    // Return fallback data
    return NextResponse.json({
      sales: [],
      total: 0,
      limit: 10,
      lastUpdated: new Date().toISOString(),
      error: 'Could not fetch recent sales'
    });
  }
}