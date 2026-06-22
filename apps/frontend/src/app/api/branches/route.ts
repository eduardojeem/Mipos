import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAccess } from '@/app/api/_utils/company-authorization';
import { createAdminClient } from '@/lib/supabase/server';

// Fallback limits per plan when saas_plans.max_locations is not configured
const PLAN_MAX_LOCATIONS: Record<string, number> = {
  FREE: 1,
  STARTER: 3,
  PROFESSIONAL: 10,
  ENTERPRISE: 999,
};

async function getMaxLocationsForPlan(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  planName: string
): Promise<number> {
  const normalized = planName.toUpperCase().trim();

  try {
    const slugCandidates = [
      normalized.toLowerCase(),
      normalized.toLowerCase().replace(/_/g, '-'),
      normalized,
    ];

    const { data } = await (adminClient as any)
      .from('saas_plans')
      .select('max_locations')
      .in('slug', slugCandidates)
      .not('max_locations', 'is', null)
      .order('max_locations', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data?.max_locations != null) return Number(data.max_locations);
  } catch {
    // fall through to hardcoded fallback
  }

  return PLAN_MAX_LOCATIONS[normalized] ?? 1;
}

type BranchBody = {
  name?: unknown;
  slug?: unknown;
  address?: unknown;
  phone?: unknown;
};

function getRequestedOrganizationId(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-organization-id')?.trim() ||
    request.nextUrl.searchParams.get('organizationId')?.trim() ||
    undefined
  );
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function wantsActiveOnly(request: NextRequest): boolean {
  return request.nextUrl.searchParams.get('activeOnly') === 'true';
}

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'sucursal';
}

async function uniqueBranchSlug(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string,
  baseSlug: string
) {
  const { data } = await adminClient
    .from('branches')
    .select('slug')
    .eq('organization_id', organizationId)
    .like('slug', `${baseSlug}%`);

  const existing = new Set((data || []).map((item: { slug: string | null }) => item.slug).filter(Boolean));
  if (!existing.has(baseSlug)) return baseSlug;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${baseSlug}-${index}`;
    if (!existing.has(candidate)) return candidate;
  }

  return `${baseSlug}-${Date.now().toString(36)}`;
}

export async function GET(request: NextRequest) {
  const access = await requireCompanyAccess(request, {
    companyId: getRequestedOrganizationId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const maxLocations = await getMaxLocationsForPlan(adminClient, access.context.plan);
  const activeOnly = wantsActiveOnly(request);
  let query = adminClient
    .from('branches')
    .select('id,name,slug,address,phone,is_active,created_at,updated_at', { count: 'exact' })
    .eq('organization_id', access.context.companyId)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudieron cargar sucursales' }, { status: 500 });
  }

  const { count: totalCount, error: totalCountError } = await adminClient
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', access.context.companyId);

  if (totalCountError) {
    return NextResponse.json({ error: totalCountError.message || 'No se pudo validar el uso de sucursales' }, { status: 500 });
  }

  const currentLocations = totalCount || 0;

  return NextResponse.json({
    success: true,
    data: data || [],
    total: count || 0,
    meta: {
      plan: access.context.plan,
      maxLocations,
      currentLocations,
      limitReached: currentLocations >= maxLocations,
      activeOnly,
    },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireCompanyAccess(request, {
    companyId: getRequestedOrganizationId(request),
    allowedRoles: ['OWNER', 'ADMIN', 'SUPER_ADMIN'],
  });

  if (!access.ok) {
    return NextResponse.json(access.body, { status: access.status });
  }

  if (!access.context.companyId) {
    return NextResponse.json({ error: 'Organizacion no resuelta' }, { status: 400 });
  }

  const body = (await request.json()) as BranchBody;
  const name = asText(body.name);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'El nombre de la sucursal es requerido' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { count: existingCount, error: countError } = await adminClient
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', access.context.companyId);

  if (countError) {
    return NextResponse.json({ error: countError.message || 'No se pudo validar el limite de sucursales' }, { status: 500 });
  }

  const maxLocations = await getMaxLocationsForPlan(adminClient, access.context.plan);

  if ((existingCount || 0) >= maxLocations) {
    const planLabel = access.context.plan || 'actual';
    const msg =
      maxLocations === 1
        ? `Tu plan ${planLabel} solo permite 1 sucursal. Actualiza tu plan para agregar más sedes.`
        : `Tu plan ${planLabel} permite máximo ${maxLocations} sucursales. Actualiza tu plan para agregar más sedes.`;
    return NextResponse.json({ error: msg, limitReached: true, maxLocations }, { status: 403 });
  }

  const baseSlug = toSlug(asText(body.slug) || name);
  const slug = await uniqueBranchSlug(adminClient, access.context.companyId, baseSlug);

  const { data, error } = await adminClient
    .from('branches')
    .insert({
      organization_id: access.context.companyId,
      name,
      slug,
      address: asText(body.address) || null,
      phone: asText(body.phone) || null,
      is_active: true,
    })
    .select('id,name,slug,address,phone,is_active,created_at,updated_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'No se pudo crear la sucursal' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
