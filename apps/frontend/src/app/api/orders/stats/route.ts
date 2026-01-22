import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar si las tablas existen
    const { data: tableCheck } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
      .maybeSingle();

    // Si no existen las tablas, devolver estadísticas vacías
    if (tableCheck === null) {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          pending: 0,
          confirmed: 0,
          preparing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          todayRevenue: 0,
          avgOrderValue: 0
        }
      });
    }

    // Obtener estadísticas en paralelo
    const [
      totalOrders,
      statusCounts,
      todayRevenue,
      avgOrderValue
    ] = await Promise.all([
      // Total de pedidos
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }),

      // Conteo por estado
      supabase
        .from('orders')
        .select('status')
        .then(({ data }: { data: any[] | null }) => {
          const counts = {
            pending: 0,
            confirmed: 0,
            preparing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
          };
          
          data?.forEach((order: any) => {
            const status = order.status.toLowerCase();
            if (status in counts) {
              counts[status as keyof typeof counts]++;
            }
          });
          
          return counts;
        }),

      // Ingresos de hoy
      supabase
        .from('orders')
        .select('total')
        .gte('created_at', new Date().toISOString().split('T')[0])
        .neq('status', 'CANCELLED')
        .then(({ data }: { data: any[] | null }) => {
          return data?.reduce((sum: number, order: any) => sum + (order.total || 0), 0) || 0;
        }),

      // Valor promedio de pedido
      supabase
        .from('orders')
        .select('total')
        .neq('status', 'CANCELLED')
        .then(({ data }: { data: any[] | null }) => {
          if (!data || data.length === 0) return 0;
          const total = data.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
          return total / data.length;
        })
    ]);

    const stats = {
      total: totalOrders.count || 0,
      pending: statusCounts.pending,
      confirmed: statusCounts.confirmed,
      preparing: statusCounts.preparing,
      shipped: statusCounts.shipped,
      delivered: statusCounts.delivered,
      cancelled: statusCounts.cancelled,
      todayRevenue: todayRevenue,
      avgOrderValue: avgOrderValue
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    
    // Fallback con estadísticas vacías
    return NextResponse.json({
      success: true,
      data: {
        total: 0,
        pending: 0,
        confirmed: 0,
        preparing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        todayRevenue: 0,
        avgOrderValue: 0
      }
    });
  }
}
