import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';
import { getSupabaseAdminConfig } from '@/lib/env';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { getCanonicalPlanAliases, normalizePlanCode } from '@/lib/plan-catalog';

const COMPONENT = 'SuperAdminOrganizationsAPI';
const ALLOWED_PLANS = new Set(['FREE', 'STARTER', 'PROFESSIONAL']);
const ALLOWED_STATUSES = new Set(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'TRIAL']);
const SORTABLE_FIELDS: Record<string, 'created_at' | 'updated_at' | 'name' | 'slug' | 'subscription_status' | 'subscription_plan'> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  name: 'name',
  slug: 'slug',
  subscription_status: 'subscription_status',
  subscription_plan: 'subscription_plan',
};

function normalizePlan(plan?: string | null) {
  return normalizePlanCode(plan);
}

function getOrganizationPlanFilterValues(plan?: string | null) {
  return getCanonicalPlanAliases(plan).map((alias) => normalizePlanCode(alias));
}

async function cleanupProvisionedOrganization(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  userId?: string | null
) {
  if (userId) {
    try {
      await adminClient.auth.admin.deleteUser(userId);
    } catch (error) {
      structuredLogger.error('Error cleaning invited user after organization provisioning failure', error as Error, {
        component: COMPONENT,
        action: 'POST_CLEANUP_USER',
        metadata: { organizationId, userId },
      });
    }
  }

  try {
    await adminClient.from('organizations').delete().eq('id', organizationId);
  } catch (error) {
    structuredLogger.error('Error cleaning organization after provisioning failure', error as Error, {
      component: COMPONENT,
      action: 'POST_CLEANUP_ORG',
      metadata: { organizationId, userId },
    });
  }
}

async function promoteOrganizationAdminsForPaidPlan(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationIds: string[]
) {
  if (organizationIds.length === 0) return;

  const { data: adminRole } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'ADMIN')
    .single();

  if (!adminRole?.id) return;

  const { data: memberships } = await adminClient
    .from('organization_members')
    .select('id,user_id,organization_id,role_id,is_owner,created_at')
    .in('organization_id', organizationIds)
    .order('created_at', { ascending: true });

  if (!memberships || memberships.length === 0) return;

  const targets = new Map<string, { membershipId: string; userId: string }>();
  for (const organizationId of organizationIds) {
    const orgMemberships = memberships.filter((membership: any) => membership.organization_id === organizationId);
    const ownerMembership = orgMemberships.find((membership: any) => membership.is_owner);
    const fallbackMembership = orgMemberships[0];
    const target = ownerMembership || fallbackMembership;
    if (target) {
      targets.set(organizationId, { membershipId: target.id, userId: target.user_id });
    }
  }

  const targetMemberships = Array.from(targets.values());
  if (targetMemberships.length === 0) return;

  await Promise.all(targetMemberships.map((target) =>
    adminClient
      .from('organization_members')
      .update({ role_id: adminRole.id })
      .eq('id', target.membershipId)
  ));

  const { data: existingAdminRoles } = await adminClient
    .from('user_roles')
    .select('id,user_id,organization_id,is_active')
    .in('user_id', targetMemberships.map((target) => target.userId))
    .eq('role_id', adminRole.id)
    .in('organization_id', organizationIds);

  const activeByMembershipKey = new Map(
    (existingAdminRoles || []).map((item: any) => [`${item.organization_id}:${item.user_id}`, item])
  );
  const missingAssignments = Array.from(targets.entries())
    .map(([organizationId, target]) => ({ organizationId, userId: target.userId }))
    .filter((target) => !activeByMembershipKey.has(`${target.organizationId}:${target.userId}`));

  if (missingAssignments.length > 0) {
    await adminClient.from('user_roles').upsert(
      missingAssignments.map((target) => ({
        user_id: target.userId,
        role_id: adminRole.id,
        organization_id: target.organizationId,
        is_active: true,
      })),
      { onConflict: 'user_id,role_id,organization_id' }
    );
  }

  const inactiveIds = (existingAdminRoles || [])
    .filter((item: any) => item.is_active === false)
    .map((item: any) => item.id);

  if (inactiveIds.length > 0) {
    await adminClient
      .from('user_roles')
      .update({ is_active: true })
      .in('id', inactiveIds);
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const adminClient = await createAdminClient();

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    const sortBy = SORTABLE_FIELDS[searchParams.get('sortBy') || 'created_at'] || 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

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
      query = query.in('subscription_plan', getOrganizationPlanFilterValues(plan));
    }

    const { data: organizations, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      structuredLogger.error('Error fetching organizations from DB', error, { component: COMPONENT, action: 'GET' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [totalCountResult, activeCountResult, trialCountResult, suspendedCountResult] = await Promise.all([
      adminClient.from('organizations').select('id', { count: 'exact', head: true }),
      adminClient.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'ACTIVE'),
      adminClient.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'TRIAL'),
      adminClient.from('organizations').select('id', { count: 'exact', head: true }).eq('subscription_status', 'SUSPENDED'),
    ]);

    const normalizedOrganizations = (organizations || []).map((organization: any) => ({
      ...organization,
      subscription_plan: normalizePlan(organization.subscription_plan),
      member_count: organization.members?.[0]?.count || 0,
    }));

    const duration = Date.now() - startTime;
    structuredLogger.info('Organizations fetched successfully', {
      component: COMPONENT,
      action: 'GET',
      metadata: { count: normalizedOrganizations.length, total: count, duration }
    });

    return NextResponse.json({ 
      success: true, 
      organizations: normalizedOrganizations, 
      total: count || 0,
      metrics: {
        total: totalCountResult.count || 0,
        active: activeCountResult.count || 0,
        trial: trialCountResult.count || 0,
        suspended: suspendedCountResult.count || 0,
      },
      metadata: { duration }
    });
  } catch (error) {
    structuredLogger.error('Unexpected error in GET organizations', error as Error, { component: COMPONENT, action: 'GET' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Helper removed - replaced by assertSuperAdmin

export async function POST(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
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
        subscription_plan: normalizePlan(subscriptionPlan),
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
      await cleanupProvisionedOrganization(adminClient, organization.id);
      return NextResponse.json({ error: 'No se pudo invitar al administrador. La organizacion no fue creada.' }, { status: 500 });
    }

    if (adminUser?.user) {
      const { data: adminRole } = await adminClient.from('roles').select('id').eq('name', 'ADMIN').single();
      if (!adminRole?.id) {
        structuredLogger.error('Missing ADMIN role while provisioning organization', new Error('ADMIN role not found'), {
          component: COMPONENT,
          action: 'POST_ROLE_LOOKUP',
          metadata: { orgId: organization.id, userId: adminUser.user.id },
        });
        await cleanupProvisionedOrganization(adminClient, organization.id, adminUser.user.id);
        return NextResponse.json({ error: 'No se pudo asignar el rol base del administrador. La organizacion no fue creada.' }, { status: 500 });
      }

      const { error: membershipError } = await adminClient.from('organization_members').insert({
        organization_id: organization.id,
        user_id: adminUser.user.id,
        role_id: adminRole.id,
        is_owner: true,
      });
      if (membershipError) {
        structuredLogger.error('Error creating admin membership', membershipError, { component: COMPONENT, action: 'POST_MEMBERSHIP', metadata: { orgId: organization.id } });
        await cleanupProvisionedOrganization(adminClient, organization.id, adminUser.user.id);
        return NextResponse.json({ error: 'No se pudo vincular el administrador. La organizacion no fue creada.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, organization, message: 'Organización creada exitosamente' });
  } catch (error) {
    structuredLogger.error('Unexpected error in POST organizations', error as Error, { component: COMPONENT, action: 'POST' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { id, ids, ...updates } = body;

    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });
    }

    const allowedUpdates: Record<string, unknown> = {};
    if (typeof updates.name === 'string') allowedUpdates.name = updates.name.trim();
    if (typeof updates.slug === 'string') allowedUpdates.slug = updates.slug.trim().toLowerCase();
    if (typeof updates.subscription_status === 'string' && ALLOWED_STATUSES.has(updates.subscription_status.toUpperCase())) {
      allowedUpdates.subscription_status = updates.subscription_status.toUpperCase();
    }
    if (typeof updates.subscription_plan === 'string') {
      const normalizedPlan = normalizePlan(updates.subscription_plan);
      if (ALLOWED_PLANS.has(normalizedPlan)) {
        allowedUpdates.subscription_plan = normalizedPlan;
        if (!allowedUpdates.subscription_status) {
          allowedUpdates.subscription_status = 'ACTIVE';
        }
      }
    }
    if (updates.settings && typeof updates.settings === 'object' && !Array.isArray(updates.settings)) {
      allowedUpdates.settings = updates.settings;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios validos para aplicar' }, { status: 400 });
    }

    const adminClient = await createAdminClient();
    const targetIds = id ? [id] : ids;
    const shouldPromoteAdmins = typeof allowedUpdates.subscription_plan === 'string' && allowedUpdates.subscription_plan !== 'FREE';

    let freePlanOrganizationIds: string[] = [];
    if (shouldPromoteAdmins && targetIds.length > 0) {
      const { data: currentOrganizations } = await adminClient
        .from('organizations')
        .select('id,subscription_plan')
        .in('id', targetIds);

      freePlanOrganizationIds = (currentOrganizations || [])
        .filter((organization: any) => normalizePlan(organization.subscription_plan) === 'FREE')
        .map((organization: any) => organization.id);
    }

    let query = adminClient.from('organizations').update(allowedUpdates);
    
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

    if (freePlanOrganizationIds.length > 0) {
      await promoteOrganizationAdminsForPaidPlan(adminClient, freePlanOrganizationIds);
    }

    return NextResponse.json({ success: true, organization: id ? data[0] : data });
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization', error as Error, { component: COMPONENT, action: 'PATCH' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',');

    if (!id && !ids) return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });

    const adminClient = await createAdminClient();
    let query = adminClient.from('organizations').update({
      subscription_status: 'SUSPENDED',
      updated_at: new Date().toISOString(),
    });
    
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

    return NextResponse.json({ success: true, message: 'Organizaciones suspendidas correctamente' });
  } catch (error) {
    structuredLogger.error('Unexpected error in DELETE organization', error as Error, { component: COMPONENT, action: 'DELETE' });
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
