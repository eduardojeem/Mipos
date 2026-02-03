import { createClient, createAdminClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';
import { getSupabaseAdminConfig } from '@/lib/env';

export async function checkSuperAdminPermission() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { authorized: false, error: 'No autorizado', status: 401 };
  }

  const adminClient = await createAdminClient();
  
  // Check 1: roles table via user_roles
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);
  
  const hasRole = Array.isArray(userRoles) && userRoles.some((ur: any) => ur.role?.name === 'SUPER_ADMIN');
  if (hasRole) return { authorized: true, user };

  // Check 2: users table
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role === 'SUPER_ADMIN') return { authorized: true, user };

  // Check 3: metadata
  const userMetadata = user.user_metadata as { role?: string } | undefined;
  if (userMetadata?.role === 'SUPER_ADMIN') return { authorized: true, user };

  return { authorized: false, error: 'Acceso denegado', status: 403 };
}

export async function fetchSuperAdminData() {
  const auth = await checkSuperAdminPermission();
  if (!auth.authorized) {
    throw new Error(auth.error);
  }

  const adminConfig = getSupabaseAdminConfig();
  if (!adminConfig) {
    throw new Error('Configuración incompleta: falta SUPABASE_SERVICE_ROLE_KEY');
  }

  const adminClient = await createAdminClient();

  // Parallel fetch
  const [orgsRes, statsRes] = await Promise.all([
    // Organizations
    adminClient
      .from('organizations')
      .select('*, members:organization_members(count)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, 99),
      
    // Stats (simplified calculation for initial load)
    Promise.all([
      adminClient.from('organizations').select('*', { count: 'exact', head: true }),
      adminClient.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'ACTIVE'),
      adminClient.from('users').select('*', { count: 'exact', head: true }),
      adminClient.from('saas_subscriptions').select('plan_id, billing_cycle, saas_plans(price_monthly, price_yearly)').eq('status', 'active')
    ])
  ]);

  // Process Stats
  const [allOrgs, activeOrgs, allUsers, subs] = statsRes;
  
  let monthlyRevenue = 0;
  if (subs.data) {
    subs.data.forEach((sub: any) => {
      if (sub.saas_plans) {
        if (sub.billing_cycle === 'yearly') {
          monthlyRevenue += (sub.saas_plans.price_yearly || 0) / 12;
        } else {
          monthlyRevenue += (sub.saas_plans.price_monthly || 0);
        }
      }
    });
  }

  // Fallback revenue estimation
  const activeOrgsCount = activeOrgs.count || 0;
  if (monthlyRevenue === 0 && activeOrgsCount > 0) {
    monthlyRevenue = activeOrgsCount * 49;
  }

  return {
    organizations: orgsRes.data || [],
    stats: {
      totalOrganizations: allOrgs.count || 0,
      activeOrganizations: activeOrgsCount,
      totalUsers: allUsers.count || 0,
      activeUsers: allUsers.count || 0, // Simplified
      totalRevenue: monthlyRevenue * 12,
      monthlyRevenue: monthlyRevenue,
      activeSubscriptions: activeOrgsCount
    }
  };
}
