import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';
import { getSupabaseAdminConfig } from '@/lib/env';

const COMPONENT = 'SuperAdminOrganizationsAPI';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Robust Role check (matching stats API)
    let isSuperAdmin = false;
    const adminClient = await createAdminClient();
    
    // Check 1: roles table via user_roles
    const { data: userRoles } = await adminClient
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    interface UserRoleResponse {
      role: { name: string } | null;
    }
    
    isSuperAdmin = Array.isArray(userRoles) && (userRoles as unknown as UserRoleResponse[]).some((ur) => ur.role?.name === 'SUPER_ADMIN');

    // Check 2: users table
    if (!isSuperAdmin) {
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      isSuperAdmin = userData?.role === 'SUPER_ADMIN';
    }

    // Check 3: metadata
    if (!isSuperAdmin) {
      const userMetadata = user.user_metadata as { role?: string } | undefined;
      isSuperAdmin = userMetadata?.role === 'SUPER_ADMIN';
    }

    if (!isSuperAdmin) {
      structuredLogger.warn('Access denied to Organizations API', {
        component: COMPONENT,
        action: 'GET',
        metadata: { userId: user.id }
      });
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // 3. Admin config check
    const adminConfig = getSupabaseAdminConfig();
    if (!adminConfig) {
      structuredLogger.error('Missing Supabase Service Role Key', new Error('Configuration error'), {
        component: COMPONENT,
        action: 'validateEnvironment',
      });
      return NextResponse.json({ error: 'Configuración incompleta: falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    // 4. Data query
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    let query = adminClient
      .from('organizations')
      .select('*, members:organization_members(count)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }
    if (status && status !== 'ALL') {
      query = query.eq('subscription_status', status);
    }
    if (plan && plan !== 'ALL') {
      query = query.eq('subscription_plan', plan);
    }

    const { data: organizations, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      structuredLogger.error('Error fetching organizations from DB', error, { component: COMPONENT, action: 'GET' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    structuredLogger.info('Organizations fetched successfully', {
      component: COMPONENT,
      action: 'GET',
      metadata: { count: organizations?.length, total: count, duration }
    });

    return NextResponse.json({ 
      success: true, 
      organizations: organizations || [], 
      total: count || 0,
      metadata: { duration }
    });
  } catch (error) {
    structuredLogger.error('Unexpected error in GET organizations', error as Error, { component: COMPONENT, action: 'GET' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Helper robusto para verificar si el usuario es Super Admin
 */
async function checkSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'No autorizado', status: 401 };

  const adminClient = await createAdminClient();
  
  // 1. Roles table
  const { data: userRoles } = await adminClient
    .from('user_roles')
    .select('role:roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);
    interface UserRoleResponse {
      role: { name: string } | null;
    }

    if (Array.isArray(userRoles) && (userRoles as unknown as UserRoleResponse[]).some((ur) => ur.role?.name === 'SUPER_ADMIN')) {
      return { user, isSuperAdmin: true };
    }

  // 2. Users table
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role === 'SUPER_ADMIN') {
    return { user, isSuperAdmin: true };
  }

  // 3. Metadata
    const userMetadata = user.user_metadata as { role?: string } | undefined;
    if (userMetadata?.role === 'SUPER_ADMIN') {
      return { user, isSuperAdmin: true };
    }

  return { error: 'Acceso denegado', status: 403 };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkSuperAdmin(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const {
      name,
      slug,
      description,
      industry,
      email,
      phone,
      website,
      address,
      city,
      state,
      country,
      postalCode,
      subscriptionPlan,
      subscriptionStatus,
      maxUsers,
      features,
      settings,
      adminName,
      adminEmail,
      adminPhone,
      allowTrialPeriod,
      trialDays,
    } = body;

    // Validations
    if (!name || !slug || !email || !adminName || !adminEmail) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Use admin client to query and insert
    const adminClient = await createAdminClient();

    // Check slug
    const { data: existingOrg } = await adminClient.from('organizations').select('id').eq('slug', slug).single();
    if (existingOrg) {
      return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 });
    }

    // Prepare settings
    const organizationSettings = { ...settings, description, industry, contactInfo: { email, phone, website }, address: { street: address, city, state, country, postalCode }, limits: { maxUsers }, features, trial: allowTrialPeriod ? { enabled: true, days: trialDays } : null };

    // Create organization
    const { data: organization, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name,
        slug,
        subscription_plan: subscriptionPlan,
        subscription_status: allowTrialPeriod ? 'TRIAL' : subscriptionStatus,
        settings: organizationSettings,
      })
      .select()
      .single();

    if (orgError) {
      structuredLogger.error('Error creating organization', orgError, { component: COMPONENT, action: 'POST' });
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    // Invite admin (already uses service role internally if configured)
    const { data: adminUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      adminEmail,
      {
        data: { full_name: adminName, phone: adminPhone, organization_id: organization.id, role: 'ADMIN' },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    );

    if (inviteError) {
      structuredLogger.error('Error inviting admin user', inviteError, { component: COMPONENT, action: 'POST_INVITE', metadata: { orgId: organization.id } });
    }

    if (adminUser?.user) {
      const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'ADMIN').single();
      if (adminRole) {
        await adminClient.from('organization_members').insert({
          organization_id: organization.id,
          user_id: adminUser.user.id,
          role_id: adminRole.id,
          is_owner: true,
        });
      }
    }

    return NextResponse.json({ success: true, organization, message: 'Organización creada exitosamente' });
  } catch (error) {
    structuredLogger.error('Unexpected error in POST organizations', error as Error, { component: COMPONENT, action: 'POST' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkSuperAdmin(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { id, ids, ...updates } = body;

    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    let query = adminClient.from('organizations').update(updates);
    
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.in('id', ids);
    }

    const { data, error } = await query.select();

    if (error) {
      structuredLogger.error('Error updating organization(s)', error, { component: COMPONENT, action: 'PATCH', metadata: { id, ids } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: id ? data[0] : data });
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization', error as Error, { component: COMPONENT, action: 'PATCH' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkSuperAdmin(supabase);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',');

    if (!id && !ids) return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });

    const adminClient = await createAdminClient();
    let query = adminClient.from('organizations').delete();
    
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.in('id', ids!);
    }

    const { error } = await query;

    if (error) {
      structuredLogger.error('Error deleting organization(s)', error, { component: COMPONENT, action: 'DELETE', metadata: { id, ids } });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    structuredLogger.error('Unexpected error in DELETE organization', error as Error, { component: COMPONENT, action: 'DELETE' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
