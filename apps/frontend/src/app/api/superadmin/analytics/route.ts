import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de super admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

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

    // 2. Plan Distribution
    const { data: planDistribution, error: planError } = await supabase
      .from('organizations')
      .select('plan_id, subscription_plans(name)');

    if (planError) throw planError;

    const planCounts = planDistribution?.reduce((acc: Record<string, number>, org: { plan_id: string; subscription_plans: { name: string } | null }) => {
      const planName = org.subscription_plans?.name || 'Free';
      acc[planName] = (acc[planName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 3. User Activity - Usuarios activos vs inactivos por mes
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at, is_active, last_sign_in_at')
      .gte('created_at', sixMonthsAgo.toISOString());

    if (usersError) throw usersError;

    const activityData = aggregateUserActivity(users || []);

    // 4. Revenue Estimation (basado en planes)
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        amount,
        billing_cycle,
        status,
        organization_id,
        organizations(plan_id)
      `)
      .eq('status', 'active');

    if (subsError) throw subsError;

    const revenueData = calculateRevenueMetrics(subscriptions || []);

    // 5. Top Organizations por usuarios
    const { data: topOrgs, error: topOrgsError } = await supabase
      .rpc('get_organizations_with_user_count')
      .limit(5);

    // Si el RPC no existe, usar un query alternativo
    let topOrganizations = [];
    if (topOrgsError) {
      const { data: orgsWithCounts } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          organization_users(count)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      topOrganizations = orgsWithCounts?.map((org: { id: string; name: string; organization_users: Array<{ count: number }> }) => ({
        name: org.name,
        user_count: org.organization_users?.[0]?.count || 0
      })) || [];
    } else {
      topOrganizations = topOrgs || [];
    }

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

function aggregateUserActivity(users: Array<{ created_at: string; is_active: boolean; last_sign_in_at: string | null }>) {
  const monthMap = new Map<string, { active: number; inactive: number }>();
  
  // Inicializar últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7);
    monthMap.set(monthKey, { active: 0, inactive: 0 });
    months.push(monthKey);
  }

  // Contar usuarios activos vs inactivos
  users.forEach(user => {
    const date = new Date(user.created_at);
    const monthKey = date.toISOString().slice(0, 7);
    
    if (monthMap.has(monthKey)) {
      const current = monthMap.get(monthKey)!;
      if (user.is_active) {
        current.active++;
      } else {
        current.inactive++;
      }
    }
  });

  return months.map(month => ({
    month: formatMonth(month),
    active: monthMap.get(month)?.active || 0,
    inactive: monthMap.get(month)?.inactive || 0
  }));
}

function calculateRevenueMetrics(subscriptions: Array<{ amount: number; billing_cycle: string; status: string; organization_id: string }>) {
  let mrr = 0; // Monthly Recurring Revenue
  
  subscriptions.forEach(sub => {
    const amount = sub.amount || 0;
    const cycle = sub.billing_cycle || 'monthly';
    
    if (cycle === 'monthly') {
      mrr += amount;
    } else if (cycle === 'yearly') {
      mrr += amount / 12;
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
