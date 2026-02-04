import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const supabase = await createClient();

    // Obtener fecha de hace 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 1. Growth Data - Organizaciones creadas por mes
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    if (orgsError) throw orgsError;

    // Agrupar por mes
    const growthData = aggregateByMonth(organizations || [], 'created_at');

    // 2. Plan Distribution - usando subscription_plan directamente de organizations
    const { data: planDistribution, error: planError } = await supabase
      .from('organizations')
      .select('subscription_plan');

    if (planError) throw planError;

    const planCounts = planDistribution?.reduce((acc: Record<string, number>, org: { subscription_plan: string | null }) => {
      const planName = org.subscription_plan || 'free';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 3. User Activity - Usuarios creados por mes (sin is_active que no existe)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    if (usersError) throw usersError;

    const activityData = aggregateUsersByMonth(users || []);

    // 4. Revenue Estimation (basado en saas_subscriptions)
    const { data: subscriptions, error: subsError } = await supabase
      .from('saas_subscriptions')
      .select(`
        plan_id,
        billing_cycle,
        status,
        organization_id,
        saas_plans(price_monthly, price_yearly)
      `)
      .eq('status', 'active');

    if (subsError) throw subsError;

    const revenueData = calculateRevenueMetrics(subscriptions || []);

    // 5. Top Organizations - simplificado, solo mostramos las más recientes
    const { data: topOrgs } = await supabase
      .from('organizations')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const topOrganizations = topOrgs?.map(org => ({
      name: org.name,
      user_count: 0 // Por ahora no tenemos forma de contar usuarios por org
    })) || [];

    return NextResponse.json({
      growthData,
      planDistribution: Object.entries(planCounts || {}).map(([name, value]) => ({
        name,
        value
      })),
      activityData,
      revenueData,
      topOrganizations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al obtener analytics' },
      { status: 500 }
    );
  }
}

// Helper functions
function aggregateByMonth(data: Array<{ [key: string]: string }>, dateField: string) {
  const monthMap = new Map<string, number>();
  
  // Inicializar últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
    monthMap.set(monthKey, 0);
    months.push(monthKey);
  }

  // Contar items por mes
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const monthKey = date.toISOString().slice(0, 7);
    if (monthMap.has(monthKey)) {
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    }
  });

  return months.map(month => ({
    month: formatMonth(month),
    count: monthMap.get(month) || 0
  }));
}

function aggregateUsersByMonth(users: Array<{ created_at: string }>) {
  const monthMap = new Map<string, number>();
  
  // Inicializar últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7);
    monthMap.set(monthKey, 0);
    months.push(monthKey);
  }

  // Contar usuarios por mes
  users.forEach(user => {
    const date = new Date(user.created_at);
    const monthKey = date.toISOString().slice(0, 7);
    
    if (monthMap.has(monthKey)) {
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
    }
  });

  return months.map(month => ({
    month: formatMonth(month),
    active: monthMap.get(month) || 0,
    inactive: 0 // No tenemos datos de inactivos por ahora
  }));
}

function calculateRevenueMetrics(subscriptions: Array<{ 
  billing_cycle: string; 
  status: string; 
  organization_id: string;
  saas_plans: { price_monthly: number; price_yearly: number } | null;
}>) {
  let mrr = 0; // Monthly Recurring Revenue
  
  subscriptions.forEach(sub => {
    const cycle = sub.billing_cycle || 'monthly';
    const plan = sub.saas_plans;
    
    if (!plan) return;
    
    if (cycle === 'monthly') {
      mrr += plan.price_monthly || 0;
    } else if (cycle === 'yearly') {
      mrr += (plan.price_yearly || 0) / 12;
    }
  });

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100, // Annual Recurring Revenue
    activeSubscriptions: subscriptions.length,
    averageRevenuePerSub: subscriptions.length > 0 
      ? Math.round((mrr / subscriptions.length) * 100) / 100 
      : 0
  };
}

function formatMonth(monthKey: string): string {
  const [, month] = monthKey.split('-');
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return monthNames[parseInt(month) - 1];
}
