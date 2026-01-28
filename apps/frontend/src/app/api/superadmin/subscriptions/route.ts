import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SubscriptionRecord = {
  id: string;
  organizations?: { name?: string | null } | null;
  saas_plans?: { name?: string | null; price_monthly?: number | null; price_yearly?: number | null } | null;
  status?: string | null;
  billing_cycle?: 'monthly' | 'yearly' | string | null;
  current_period_end?: string | null;
  created_at?: string | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol SUPER_ADMIN
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener suscripciones
    const { data: subscriptions, error } = await supabase
      .from('saas_subscriptions')
      .select(`
        *,
        organizations (name),
        saas_plans (name, price_monthly, price_yearly)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      // Si la tabla no existe (migración pendiente), devolvemos array vacío sin error 500 para no romper la UI
      if (error.code === '42P01') { // undefined_table
        return NextResponse.json({ success: true, subscriptions: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transformar datos para el frontend
    const formattedSubscriptions = (subscriptions ?? []).map((sub: SubscriptionRecord) => ({
      id: sub.id,
      organization: sub.organizations?.name || 'Organización desconocida',
      plan: sub.saas_plans?.name?.toLowerCase() || 'custom',
      status: sub.status,
      amount: sub.billing_cycle === 'yearly' 
        ? sub.saas_plans?.price_yearly 
        : sub.saas_plans?.price_monthly,
      billingCycle: sub.billing_cycle,
      nextBilling: sub.current_period_end || new Date().toISOString(),
      startDate: sub.created_at
    }));

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
