import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 for performance
    const userId = searchParams.get('user_id');

    const supabase = await createClient();

    // Requiere sesión y scopea por organización explícitamente (defensa en
    // profundidad: ya no depende solo de RLS para aislar tenants).
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, sales: [], total: 0, limit, lastUpdated: new Date().toISOString(), error: 'No autorizado' },
        { status: 401 },
      );
    }
    const orgId = await getUserOrganizationId(user.id);
    if (!orgId) {
      return NextResponse.json({
        success: true, sales: [], total: 0, limit, lastUpdated: new Date().toISOString(),
      });
    }

    let query = supabase
      .from('sales')
      .select(`
        id,
        total,
        payment_method,
        created_at,
        status,
        customers (
          name
        )
      `)
      .eq('organization_id', orgId)
      // El status canónico es 'COMPLETED' (MAYÚSCULA). Antes filtraba 'completed'
      // (minúscula) → 0 filas. Además la columna real del monto es `total`, no
      // `total_amount` (que no existe y rompía el select).
      .eq('status', 'COMPLETED')
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
      total_amount: sale.total || 0,
      payment_method: sale.payment_method || 'unknown',
      created_at: sale.created_at,
      status: sale.status,
      customer_name: (sale.customers as any)?.name || null
    }));

    return NextResponse.json({
      success: true,
      sales: transformedSales,
      total: count || 0,
      limit,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recent sales error:', error);
    
    return NextResponse.json({
      success: false,
      sales: [],
      total: 0,
      limit: 10,
      lastUpdated: new Date().toISOString(),
      error: 'No se pudieron cargar las ventas recientes'
    }, { status: 500 });
  }
}
