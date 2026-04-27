import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getValidatedOrganizationId } from '@/lib/organization';

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const organizationId = await getValidatedOrganizationId(request);
    if (!organizationId) {
      return NextResponse.json({ error: 'No se encontro una organizacion valida' }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const todayStart = startOfTodayIso();

    // Usamos una única RPC para contar por estado (GROUP BY en Postgres)
    // evitando descargar todas las filas al servidor de Next.js.
    const [totalOrders, statusCountsResult, todayRevenueRows, averageRows] = await Promise.all([
      supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null),
      supabase.rpc('get_order_status_counts', { org_id: organizationId }),
      supabase
        .from('sales')
        .select('id,total')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .gte('created_at', todayStart)
        .neq('status', 'CANCELLED'),
      supabase
        .from('sales')
        .select('total')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .neq('status', 'CANCELLED'),
    ]);

    if (todayRevenueRows.error || averageRows.error) {
      console.error('Error fetching order stats:', todayRevenueRows.error || averageRows.error);
      return NextResponse.json({ error: 'Error al obtener estadisticas' }, { status: 500 });
    }

    // Si la RPC aún no existe, fallback a descarga completa (degradación grácil)
    const counts = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    if (statusCountsResult.error || !statusCountsResult.data) {
      // Fallback: descargar y contar en memoria
      const { data: allStatuses } = await supabase
        .from('sales')
        .select('status')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      for (const row of allStatuses || []) {
        const s = String(row.status || '').toLowerCase();
        if (s in counts) counts[s as keyof typeof counts] += 1;
      }
    } else {
      for (const row of statusCountsResult.data as Array<{ status: string; count: number }>) {
        const s = String(row.status || '').toLowerCase();
        if (s in counts) counts[s as keyof typeof counts] = Number(row.count || 0);
      }
    }

    const todayOrders = (todayRevenueRows.data || []).length;
    const todayRevenue = (todayRevenueRows.data || []).reduce(
      (sum: number, order: { total: number | null }) => sum + Number(order.total || 0),
      0
    );
    const allOrderTotals = averageRows.data || [];
    const avgOrderValue = allOrderTotals.length
      ? allOrderTotals.reduce(
          (sum: number, order: { total: number | null }) => sum + Number(order.total || 0),
          0
        ) / allOrderTotals.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        total: totalOrders.count || 0,
        pending: counts.pending,
        confirmed: counts.confirmed,
        preparing: counts.preparing,
        shipped: counts.shipped,
        delivered: counts.delivered,
        cancelled: counts.cancelled,
        todayRevenue,
        todayOrders,
        avgOrderValue,
      },
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al obtener estadisticas' },
      { status: 500 }
    );
  }
}
