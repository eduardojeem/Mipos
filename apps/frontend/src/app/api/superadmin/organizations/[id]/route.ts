import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { normalizePlanCode } from '@/lib/plan-catalog';
import {
  buildSubscriptionResponse,
  getPlanRecord,
  getSubscriptionSnapshot,
  getUsageSnapshot,
  syncOrganizationSubscriptionState,
} from '../../../subscription/_lib';

const COMPONENT = 'SuperAdminOrganizationDetailAPI';
const ALLOWED_STATUSES = new Set(['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED']);

function normalizePlan(plan?: string | null) {
  return normalizePlanCode(plan);
}

function normalizeBillingCycle(raw?: string | null): 'monthly' | 'yearly' {
  return String(raw || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const DOMAIN_REGEX = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;

async function ensureUniqueOrganizationField(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  field: 'slug' | 'subdomain' | 'custom_domain',
  value: string,
  organizationId: string
) {
  const { data } = await adminClient
    .from('organizations')
    .select('id')
    .eq(field, value)
    .neq('id', organizationId)
    .maybeSingle();

  return Boolean(data?.id);
}

async function promoteOrganizationAdminsForPaidPlan(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string
) {
  const { data: adminRole } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'ADMIN')
    .single();

  if (!adminRole?.id) return;

  const { data: memberships } = await adminClient
    .from('organization_members')
    .select('id,user_id,is_owner,created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  const targetMembership = memberships?.find((membership: any) => membership.is_owner) || memberships?.[0];
  if (!targetMembership) return;

  await adminClient
    .from('organization_members')
    .update({ role_id: adminRole.id })
    .eq('id', targetMembership.id);

  const { data: existingUserRole } = await adminClient
    .from('user_roles')
    .select('id,is_active')
    .eq('user_id', targetMembership.user_id)
    .eq('role_id', adminRole.id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!existingUserRole) {
    await adminClient.from('user_roles').upsert(
      [{
        user_id: targetMembership.user_id,
        role_id: adminRole.id,
        organization_id: organizationId,
        is_active: true,
      }],
      { onConflict: 'user_id,role_id,organization_id' }
    );
    return;
  }

  if (existingUserRole.is_active === false) {
    await adminClient
      .from('user_roles')
      .update({ is_active: true })
      .eq('id', existingUserRole.id);
  }
}

async function buildOrganizationDetailResponse(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  id: string
) {
  const { data: organization, error } = await adminClient
    .from('organizations')
    .select('*, members:organization_members(count)')
    .eq('id', id)
    .single();

  if (error || !organization) {
    throw new Error(error?.message || 'Organizacion no encontrada');
  }

  let subscription = null;
  let usage = null;

  try {
    const snapshot = await getSubscriptionSnapshot(id);
    subscription = buildSubscriptionResponse({
      organization: {
        ...snapshot.organization,
        subscription_status: snapshot.subscriptionStatus,
      },
      plan: snapshot.plan,
      billingCycle: snapshot.billingCycle,
      currentPeriodStart: snapshot.currentPeriodStart,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      isOrgAdmin: true,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      statusOverride: snapshot.subscriptionStatus,
    });
    usage = await getUsageSnapshot(id);
  } catch (subscriptionError) {
    structuredLogger.warn('Unable to enrich organization detail with subscription snapshot', {
      component: COMPONENT,
      action: 'GET_SUBSCRIPTION_ENRICH',
      metadata: {
        id,
        error: subscriptionError instanceof Error ? subscriptionError.message : String(subscriptionError),
      },
    });
  }

  return {
    ...organization,
    subscription_plan: normalizePlan(organization.subscription_plan),
    member_count: organization.members?.[0]?.count || 0,
    subscription,
    usage,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const adminClient = await createAdminClient();
    const organization = await buildOrganizationDetailResponse(adminClient, id);

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    structuredLogger.error('Unexpected error in GET organization detail', error as Error, {
      component: COMPONENT,
      action: 'GET',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await assertSuperAdmin(request);
  if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const { id } = await params;
    const adminClient = await createAdminClient();
    const body = await request.json();

    const { data: currentOrganization, error: currentOrganizationError } = await adminClient
      .from('organizations')
      .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at,subdomain,custom_domain')
      .eq('id', id)
      .single();

    if (currentOrganizationError || !currentOrganization) {
      return NextResponse.json({ error: currentOrganizationError?.message || 'Organizacion no encontrada' }, { status: 404 });
    }

    const { data: currentSaasSubscription } = await adminClient
      .from('saas_subscriptions')
      .select('id,status,billing_cycle')
      .eq('organization_id', id)
      .maybeSingle();

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') {
      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return NextResponse.json({ error: 'El nombre no puede estar vacio' }, { status: 400 });
      }
      updates.name = normalizedName;
    }

    if (typeof body.slug === 'string') {
      const normalizedSlug = body.slug.trim().toLowerCase();
      if (!normalizedSlug) {
        return NextResponse.json({ error: 'El slug es obligatorio' }, { status: 400 });
      }
      if (!SLUG_REGEX.test(normalizedSlug)) {
        return NextResponse.json({ error: 'Slug invalido. Usa minusculas, numeros y guiones.' }, { status: 400 });
      }

      const slugInUse = await ensureUniqueOrganizationField(adminClient, 'slug', normalizedSlug, id);
      if (slugInUse) {
        return NextResponse.json({ error: 'Este slug ya esta en uso' }, { status: 409 });
      }

      updates.slug = normalizedSlug;
    }

    if (typeof body.subdomain === 'string') {
      const normalizedSubdomain = body.subdomain.trim().toLowerCase();
      if (!normalizedSubdomain) {
        updates.subdomain = null;
      } else {
        if (!SUBDOMAIN_REGEX.test(normalizedSubdomain)) {
          return NextResponse.json({ error: 'Subdominio invalido. Usa minusculas, numeros y guiones.' }, { status: 400 });
        }

        const subdomainInUse = await ensureUniqueOrganizationField(adminClient, 'subdomain', normalizedSubdomain, id);
        if (subdomainInUse) {
          return NextResponse.json({ error: 'Este subdominio ya esta en uso' }, { status: 409 });
        }

        updates.subdomain = normalizedSubdomain;
      }
    }

    if (body.custom_domain === null || typeof body.custom_domain === 'string') {
      const normalizedCustomDomain = body.custom_domain ? body.custom_domain.trim().toLowerCase() : '';
      if (!normalizedCustomDomain) {
        updates.custom_domain = null;
      } else {
        if (!DOMAIN_REGEX.test(normalizedCustomDomain)) {
          return NextResponse.json({ error: 'Dominio personalizado invalido' }, { status: 400 });
        }

        const customDomainInUse = await ensureUniqueOrganizationField(adminClient, 'custom_domain', normalizedCustomDomain, id);
        if (customDomainInUse) {
          return NextResponse.json({ error: 'Este dominio ya esta en uso' }, { status: 409 });
        }

        updates.custom_domain = normalizedCustomDomain;
      }
    }
    if (body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)) {
      updates.settings = body.settings;
    }

    const requestedStatus =
      typeof body.subscription_status === 'string' && ALLOWED_STATUSES.has(body.subscription_status.toUpperCase())
        ? body.subscription_status.toUpperCase()
        : null;

    const requestedPlan =
      typeof body.subscription_plan === 'string'
        ? normalizePlan(body.subscription_plan)
        : null;

    const requestedBillingCycle =
      typeof body.billingCycle === 'string'
        ? normalizeBillingCycle(body.billingCycle)
        : null;

    let latestOrganization = currentOrganization;

    if (Object.keys(updates).length > 0) {
      const { data: updatedOrganization, error: updateError } = await adminClient
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at,subdomain,custom_domain')
        .single();

      if (updateError || !updatedOrganization) {
        structuredLogger.error('Error updating organization detail', updateError || new Error('Update failed'), {
          component: COMPONENT,
          action: 'PATCH_BASE',
          metadata: { id },
        });
        return NextResponse.json({ error: updateError?.message || 'No se pudo actualizar la organizacion' }, { status: 500 });
      }

      latestOrganization = updatedOrganization;
    }

    const shouldSyncPlan = Boolean(requestedPlan || requestedBillingCycle);
    const currentSnapshot = await getSubscriptionSnapshot(id).catch(() => null);

    if (shouldSyncPlan) {
      const planRecord = await getPlanRecord(requestedPlan || latestOrganization.subscription_plan || 'free');
      if (!planRecord) {
        return NextResponse.json({ error: 'Plan no encontrado' }, { status: 400 });
      }

      await syncOrganizationSubscriptionState({
        organization: latestOrganization as any,
        plan: planRecord,
        billingCycle: requestedBillingCycle || currentSnapshot?.billingCycle || 'monthly',
      });

      if (requestedPlan && requestedPlan !== 'FREE' && normalizePlan(currentOrganization.subscription_plan) === 'FREE') {
        await promoteOrganizationAdminsForPaidPlan(adminClient, id);
      }

      const { data: refreshedOrganization } = await adminClient
        .from('organizations')
        .select('id,name,slug,subscription_plan,subscription_status,settings,created_at,updated_at,subdomain,custom_domain')
        .eq('id', id)
        .single();

      if (refreshedOrganization) {
        latestOrganization = refreshedOrganization;
      }
    }

    if (requestedStatus) {
      if (!currentSaasSubscription?.id) {
        const fallbackPlan = await getPlanRecord(requestedPlan || latestOrganization.subscription_plan || 'free');
        if (fallbackPlan) {
          await syncOrganizationSubscriptionState({
            organization: latestOrganization as any,
            plan: fallbackPlan,
            billingCycle: requestedBillingCycle || currentSnapshot?.billingCycle || normalizeBillingCycle((latestOrganization.settings as any)?.billingCycle),
          });
        }
      }

      const nowIso = new Date().toISOString();
      await adminClient
        .from('organizations')
        .update({ subscription_status: requestedStatus, updated_at: nowIso })
        .eq('id', id);

      await adminClient
        .from('saas_subscriptions')
        .update({
          status: requestedStatus,
          billing_cycle: requestedBillingCycle || currentSaasSubscription?.billing_cycle || currentSnapshot?.billingCycle || 'monthly',
          updated_at: nowIso,
        })
        .eq('organization_id', id);

      await adminClient
        .from('plan_subscriptions')
        .update({ is_active: requestedStatus === 'ACTIVE' || requestedStatus === 'TRIAL' })
        .eq('company_id', id);
    }

    const organization = await buildOrganizationDetailResponse(adminClient, id);

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error) {
    structuredLogger.error('Unexpected error in PATCH organization detail', error as Error, {
      component: COMPONENT,
      action: 'PATCH',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
