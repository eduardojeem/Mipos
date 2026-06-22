import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserOrganizationId } from '@/app/api/_utils/organization';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Requiere sesión y resuelve la organización para scopear (antes dependía
    // solo de RLS y sumaba todas las filas en JS).
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const orgId = await getUserOrganizationId(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    }

    // Agregación en SQL (una sola llamada, tz-aware) vía RPC get_sales_summary.
    const { data, error } = await supabase.rpc('get_sales_summary', { p_org_id: orgId });
    if (error) throw error;

    const s = (data ?? {}) as Record<string, number | string>;

    const summary = {
      todaySales: Number(s.todaySales) || 0,
      todayCount: Number(s.todayCount) || 0,
      weekSales: Number(s.weekSales) || 0,
      weekCount: Number(s.weekCount) || 0,
      monthSales: Number(s.monthSales) || 0,
      monthCount: Number(s.monthCount) || 0,
      avgTicket: Number(s.avgTicket) || 0,
      topPaymentMethod: (s.topPaymentMethod as string) || 'N/A',
      growthPercentage: Number(s.growthPercentage) || 0,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Sales summary error:', error);
    
    // Return fallback data
    return NextResponse.json({
      todaySales: 0,
      todayCount: 0,
      weekSales: 0,
      weekCount: 0,
      monthSales: 0,
      monthCount: 0,
      avgTicket: 0,
      topPaymentMethod: 'N/A',
      growthPercentage: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Fallback data - could not fetch real metrics'
    });
  }
}
