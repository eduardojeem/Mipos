import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getUserOrganizationId } from '@/app/api/_utils/organization';
import { defaultBusinessConfig } from '@/types/business-config';

type BusinessConfigRow = {
  value?: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringFromRecord(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

const PUBLIC_PLACEHOLDER_VALUES = new Set([
  '+595 21 123-456',
  '+595 981 123-456',
  '+595 21 654-321',
  'info@minegocio.com.py',
  'https://minegocio.com.py',
  'av. mariscal lopez 1234',
  'villa morra',
  'asuncion',
  'central',
  '1209',
  'cerca del shopping del sol',
]);

function cleanPublicString(value: unknown, fallback = ''): string {
  const raw = typeof value === 'string' ? value : fallback;
  const trimmed = raw.trim();
  return PUBLIC_PLACEHOLDER_VALUES.has(trimmed.toLowerCase()) || PUBLIC_PLACEHOLDER_VALUES.has(trimmed)
    ? ''
    : trimmed;
}

function publicStringFromRecord(record: Record<string, unknown>, key: string, fallback = ''): string {
  return cleanPublicString(record[key], fallback);
}

function cleanPublicRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, cleanPublicString(value)])
  );
}

async function syncOrganizationSettings(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyData: {
    name: string;
    primary_color?: string | null;
    rfc?: string | null;
    industry?: string | null;
    marketplace_category_id?: string | null;
    marketplace_category_slug?: string | null;
    marketplace_category_name?: string | null;
    size?: string | null;
    tagline?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    city?: string | null;
    department?: string | null;
  },
  organizationIdOverride?: string | null
) {
  const organizationId = organizationIdOverride || await getUserOrganizationId(userId);

  if (!organizationId) {
    return;
  }

  const now = new Date().toISOString();
  const primaryColor = companyData.primary_color || defaultBusinessConfig.branding.primaryColor;
  const marketplaceCategoryId = cleanPublicString(companyData.marketplace_category_id);
  const marketplaceCategorySlug = cleanPublicString(companyData.marketplace_category_slug);
  const marketplaceCategoryName = cleanPublicString(companyData.marketplace_category_name);

  const { error: businessConfigError } = await (async () => {
    // Partial unique index on organization_id WHERE NOT NULL doesn't satisfy
    // PostgREST ON CONFLICT. Use select + insert/update instead.
    const { data: existing } = await client
      .from('business_config')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing) {
      return client
        .from('business_config')
        .update({ business_name: companyData.name, updated_at: now })
        .eq('organization_id', organizationId);
    } else {
      return client
        .from('business_config')
        .insert({ organization_id: organizationId, business_name: companyData.name, updated_at: now });
    }
  })();

  if (businessConfigError) {
    throw new Error(`No se pudo sincronizar business_config: ${businessConfigError.message}`);
  }

  const { data: existingConfig } = await client
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const typedExistingConfig = existingConfig as BusinessConfigRow | null;
  const currentValue = typedExistingConfig?.value && typeof typedExistingConfig.value === 'object'
    ? typedExistingConfig.value
    : {};
  const currentContact = cleanPublicRecord((currentValue as { contact?: Record<string, unknown> }).contact || {});
  const currentAddress = cleanPublicRecord((currentValue as { address?: Record<string, unknown> }).address || {});

  const mergedConfig = {
    ...defaultBusinessConfig,
    ...currentValue,
    businessName: companyData.name,
    tagline:
      companyData.tagline ||
      String((currentValue as { tagline?: unknown }).tagline || defaultBusinessConfig.tagline),
    legalInfo: {
      ...defaultBusinessConfig.legalInfo,
      ...((currentValue as { legalInfo?: Record<string, unknown> }).legalInfo || {}),
      ruc:
        companyData.rfc ??
        String(
          ((currentValue as { legalInfo?: Record<string, unknown> }).legalInfo || {}).ruc ||
            defaultBusinessConfig.legalInfo.ruc ||
            ''
        ),
      economicActivity:
        marketplaceCategoryName ||
        companyData.industry ||
        String(
          ((currentValue as { legalInfo?: Record<string, unknown> }).legalInfo || {}).economicActivity ||
            defaultBusinessConfig.legalInfo.economicActivity
        ),
    },
    contact: {
      ...defaultBusinessConfig.contact,
      ...currentContact,
      phone:
        companyData.phone ??
        publicStringFromRecord(currentContact, 'phone'),
      email:
        companyData.email ??
        publicStringFromRecord(currentContact, 'email'),
      website:
        companyData.website ??
        publicStringFromRecord(currentContact, 'website'),
    },
    address: {
      ...defaultBusinessConfig.address,
      ...currentAddress,
      city:
        companyData.city ??
        publicStringFromRecord(currentAddress, 'city'),
      department:
        companyData.department ??
        publicStringFromRecord(currentAddress, 'department'),
    },
    branding: {
      ...defaultBusinessConfig.branding,
      ...((currentValue as { branding?: Record<string, unknown> }).branding || {}),
      primaryColor,
    },
    onboarding: {
      ...((currentValue as { onboarding?: Record<string, unknown> }).onboarding || {}),
      completed: true,
      completedAt: now,
      completedBy: userId,
      marketplaceCategoryId,
      marketplaceCategorySlug,
      marketplaceCategoryName,
    },
    onboardingCompleted: true,
    onboardingCompletedAt: now,
    profileCompleted: true,
    updatedAt: now,
  };

  const { error: settingsError } = await client
    .from('settings')
    .upsert(
      {
        key: 'business_config',
        organization_id: organizationId,
        value: mergedConfig,
        updated_at: now,
      },
      { onConflict: 'organization_id,key' }
    );

  if (settingsError) {
    throw new Error(`No se pudo sincronizar settings.business_config: ${settingsError.message}`);
  }

  const { data: organization } = await client
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle();
  const currentOrgSettings = isRecord(organization?.settings) ? organization.settings : {};
  const organizationUpdate: Record<string, unknown> = {
    settings: {
      ...currentOrgSettings,
      rfc: companyData.rfc || '',
      industry: marketplaceCategorySlug || companyData.industry || '',
      marketplace_category_id: marketplaceCategoryId || null,
      marketplace_category_slug: marketplaceCategorySlug || '',
      marketplace_category_name: marketplaceCategoryName || '',
      size: companyData.size || '',
      phone: companyData.phone || '',
      email: companyData.email || '',
      website: companyData.website || '',
      city: companyData.city || '',
      department: companyData.department || '',
      tagline: companyData.tagline || '',
      contact: {
        ...(isRecord(currentOrgSettings.contact) ? currentOrgSettings.contact : {}),
        phone: companyData.phone || '',
        email: companyData.email || '',
        website: companyData.website || '',
      },
    },
    updated_at: now,
  };
  if (marketplaceCategoryId) {
    organizationUpdate.marketplace_category_id = marketplaceCategoryId;
  }

  const { error: organizationSyncError } = await client
    .from('organizations')
    .update(organizationUpdate)
    .eq('id', organizationId);

  if (organizationSyncError) {
    throw new Error(`No se pudo sincronizar organizations: ${organizationSyncError.message}`);
  }
}

async function markOrganizationOnboardingComplete(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationIdOverride?: string | null
) {
  const organizationId = organizationIdOverride || await getUserOrganizationId(userId);

  if (!organizationId) {
    return;
  }

  const { data: organization, error: organizationLookupError } = await client
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .maybeSingle();

  if (organizationLookupError) {
    throw new Error(`No se pudo leer la organizacion para onboarding: ${organizationLookupError.message}`);
  }

  const currentSettings = isRecord(organization?.settings) ? organization.settings : {};
  const completedAt = new Date().toISOString();

  const { error: organizationUpdateError } = await client
    .from('organizations')
    .update({
      settings: {
        ...currentSettings,
        onboardingCompleted: true,
        onboardingCompletedAt: completedAt,
        onboardingCompletedBy: userId,
        profileCompleted: true,
      },
      updated_at: completedAt,
    })
    .eq('id', organizationId);

  if (organizationUpdateError) {
    throw new Error(`No se pudo marcar onboarding completo: ${organizationUpdateError.message}`);
  }
}

function getRequestedOrganizationId(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return (
    searchParams.get('organizationId') ||
    searchParams.get('organization_id') ||
    request.headers.get('x-organization-id') ||
    request.cookies.get('x-organization-id')?.value ||
    null
  );
}

async function validateOrganizationMembership(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  return Boolean(data?.organization_id);
}

async function resolveMarketplaceCategory(
  admin: Awaited<ReturnType<typeof createAdminClient>> | null,
  input: {
    marketplace_category_id?: unknown;
    marketplace_category_slug?: unknown;
    industry?: unknown;
  }
): Promise<{ id: string; slug: string; name: string } | null> {
  if (!admin) return null;

  const rawCandidates = [
    input.marketplace_category_id,
    input.marketplace_category_slug,
    input.industry,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  if (rawCandidates.length === 0) return null;

  const uuidCandidate = rawCandidates.find((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );

  let data: any = null;
  if (uuidCandidate) {
    const result = await (admin as any)
      .from('marketplace_categories')
      .select('id,name,slug')
      .eq('id', uuidCandidate)
      .eq('is_active', true)
      .maybeSingle();
    data = result.data;
  }

  if (!data) {
    const slugCandidates = rawCandidates.map((value) => value.toLowerCase());
    const result = await (admin as any)
      .from('marketplace_categories')
      .select('id,name,slug')
      .in('slug', slugCandidates)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    data = result.data;
  }

  if (!data?.id) return null;
  return {
    id: String(data.id),
    slug: String(data.slug || ''),
    name: String(data.name || ''),
  };
}

type OrganizationProfileRow = {
  id: string;
  name: string;
  marketplace_category_id?: string | null;
  subscription_plan?: string | null;
  settings?: Record<string, unknown> | null;
  branding?: Record<string, unknown> | null;
};

function nestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function organizationToCompanyProfile(
  organization: OrganizationProfileRow,
  businessConfigValue?: Record<string, unknown> | null
) {
  const settings = isRecord(organization.settings)
    ? organization.settings
    : {};
  const branding = isRecord(organization.branding)
    ? organization.branding
    : {};
  const businessConfig = isRecord(businessConfigValue)
    ? businessConfigValue
    : {};
  const legalInfo = nestedRecord(businessConfig, 'legalInfo');
  const contact = nestedRecord(businessConfig, 'contact');
  const address = nestedRecord(businessConfig, 'address');
  const configBranding = nestedRecord(businessConfig, 'branding');
  const onboarding = nestedRecord(businessConfig, 'onboarding');

  return {
    id: organization.id,
    name: organization.name,
    rfc: publicStringFromRecord(legalInfo, 'ruc', stringFromRecord(settings, 'rfc')),
    industry: stringFromRecord(
      settings,
      'industry',
      stringFromRecord(legalInfo, 'economicActivity', 'retail')
    ),
    marketplace_category_id: stringFromRecord(
      settings,
      'marketplace_category_id',
      stringFromRecord(onboarding, 'marketplaceCategoryId', organization.marketplace_category_id || '')
    ),
    marketplace_category_slug: stringFromRecord(settings, 'marketplace_category_slug', stringFromRecord(onboarding, 'marketplaceCategorySlug')),
    marketplace_category_name: stringFromRecord(settings, 'marketplace_category_name', stringFromRecord(onboarding, 'marketplaceCategoryName')),
    size: stringFromRecord(settings, 'size', 'micro'),
    tagline: stringFromRecord(businessConfig, 'tagline'),
    phone: publicStringFromRecord(contact, 'phone'),
    email: publicStringFromRecord(contact, 'email'),
    website: publicStringFromRecord(contact, 'website'),
    city: publicStringFromRecord(address, 'city'),
    department: publicStringFromRecord(address, 'department'),
    logo_url: stringFromRecord(configBranding, 'logo', stringFromRecord(branding, 'logo')),
    primary_color: stringFromRecord(
      configBranding,
      'primaryColor',
      stringFromRecord(branding, 'primaryColor', '#2563EB')
    ),
    plan_type: String(organization.subscription_plan || 'free').toLowerCase(),
    subscription_start: undefined,
    subscription_end: undefined,
  };
}

async function getBusinessConfigValue(
  client: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string | null
): Promise<Record<string, unknown> | null> {
  if (!organizationId) {
    return null;
  }

  const { data } = await client
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const typed = data as BusinessConfigRow | null;
  return typed?.value && isRecord(typed.value) ? typed.value : null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const requestedOrganizationId = getRequestedOrganizationId(request);
    let companyId: string | null = null;
    let organizationIdForProfile: string | null = null;

    if (requestedOrganizationId && await validateOrganizationMembership(supabaseAdmin, user.id, requestedOrganizationId)) {
      companyId = requestedOrganizationId;
      organizationIdForProfile = requestedOrganizationId;
    }

    if (!companyId) {
      const { data: userCompany } = await supabaseAdmin
        .from('user_company_associations')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      companyId = userCompany?.company_id || null;
    }

    if (!companyId) {
      companyId = await getUserOrganizationId(user.id);
    }

    if (!organizationIdForProfile) {
      organizationIdForProfile = await getUserOrganizationId(user.id);
    }

    if (!organizationIdForProfile) {
      organizationIdForProfile = companyId;
    }

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'No se encontrÃ³ empresa asociada' },
        { status: 404 }
      );
    }

    // Get company profile
    const businessConfigValue = await getBusinessConfigValue(supabaseAdmin, organizationIdForProfile);

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError || !company) {
      const { data: organization, error: organizationError } = await supabaseAdmin
        .from('organizations')
        .select('id,name,subscription_plan,subscription_status,settings,branding,marketplace_category_id')
        .eq('id', companyId)
        .maybeSingle();

      if (organizationError || !organization) {
        return NextResponse.json(
          { success: false, error: 'Error al obtener perfil de empresa' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: organizationToCompanyProfile(organization, businessConfigValue),
      });
    }

    // Get current subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('plan_subscriptions')
      .select('plan_type, start_date, end_date')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle();

    if (subscriptionError) {
      console.error('Error getting subscription:', subscriptionError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        tagline: stringFromRecord(businessConfigValue || {}, 'tagline'),
        marketplace_category_id: stringFromRecord(
          nestedRecord(businessConfigValue || {}, 'onboarding'),
          'marketplaceCategoryId',
          String((company as Record<string, unknown>).marketplace_category_id || '')
        ),
        marketplace_category_slug: stringFromRecord(nestedRecord(businessConfigValue || {}, 'onboarding'), 'marketplaceCategorySlug'),
        marketplace_category_name: stringFromRecord(nestedRecord(businessConfigValue || {}, 'onboarding'), 'marketplaceCategoryName'),
        phone: publicStringFromRecord(
          nestedRecord(businessConfigValue || {}, 'contact'),
          'phone',
          String((company as Record<string, unknown>).phone || '')
        ),
        email: publicStringFromRecord(
          nestedRecord(businessConfigValue || {}, 'contact'),
          'email',
          String((company as Record<string, unknown>).email || '')
        ),
        website: publicStringFromRecord(
          nestedRecord(businessConfigValue || {}, 'contact'),
          'website',
          String((company as Record<string, unknown>).website || '')
        ),
        city: stringFromRecord(nestedRecord(businessConfigValue || {}, 'address'), 'city'),
        department: stringFromRecord(nestedRecord(businessConfigValue || {}, 'address'), 'department'),
        logo_url: stringFromRecord(
          nestedRecord(businessConfigValue || {}, 'branding'),
          'logo',
          String((company as Record<string, unknown>).logo_url || '')
        ),
        plan_type: subscription?.plan_type || 'free',
        subscription_start: subscription?.start_date,
        subscription_end: subscription?.end_date
      }
    });

  } catch (error) {
    console.error('Error in GET /api/company/profile:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    let supabaseAdmin: Awaited<ReturnType<typeof createAdminClient>> | null = null;
    try {
      supabaseAdmin = await createAdminClient();
    } catch {
      supabaseAdmin = null;
    }
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0;
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, rfc, size, primary_color, tagline, phone, email, website, city, department } = body;
    const marketplaceCategory = await resolveMarketplaceCategory(supabaseAdmin, body);
    const marketplace_category_id = marketplaceCategory?.id || cleanPublicString(body?.marketplace_category_id);
    const marketplace_category_slug = marketplaceCategory?.slug || cleanPublicString(body?.marketplace_category_slug);
    const marketplace_category_name = marketplaceCategory?.name || cleanPublicString(body?.marketplace_category_name);
    const industry = marketplace_category_slug || cleanPublicString(body?.industry);

    // Validate required fields
    if (!name || !marketplace_category_id || !industry || !size) {
      return NextResponse.json(
        { success: false, error: 'Nombre, rubro principal y tamaño son obligatorios' },
        { status: 400 }
      );
    }

    if (typeof name === 'string' && name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'El nombre debe tener al menos 3 caracteres' },
        { status: 400 }
      );
    }

    if (supabaseAdmin && !marketplaceCategory) {
      return NextResponse.json(
        { success: false, error: 'Selecciona un rubro activo del marketplace' },
        { status: 400 }
      );
    }

    if (!cleanPublicString(phone)) {
      return NextResponse.json(
        { success: false, error: 'El telefono publico de la empresa es obligatorio' },
        { status: 400 }
      );
    }

    const clientForWrite = supabaseAdmin || supabase;
    const requestedOrganizationId = getRequestedOrganizationId(request);
    let organizationId: string | null = null;

    // Priority 1: Explicit organization header (multi-tenant context)
    if (requestedOrganizationId && supabaseAdmin) {
      const membershipOk = await validateOrganizationMembership(supabaseAdmin, user.id, requestedOrganizationId);
      if (membershipOk) {
        organizationId = requestedOrganizationId;
      }
    }

    // Priority 2: Get organization from user membership
    if (!organizationId) {
      const { data: membership } = await clientForWrite
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      organizationId = membership?.organization_id || null;
    }

    // Priority 3: Legacy companies table fallback
    if (!organizationId) {
      const { data: userCompany } = await supabase
        .from('user_company_associations')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userCompany?.company_id) {
        organizationId = userCompany.company_id;
      }
    }

    if (!organizationId) {
      if (!hasServiceRole) {
        return NextResponse.json(
          { success: false, error: 'No se encontró empresa asociada' },
          { status: 403 }
        );
      }
      // Create new company for user (legacy path)
      const { data: newCompany, error: createError } = await clientForWrite
        .from('companies')
        .insert({
          name,
          rfc,
          industry,
          size,
          primary_color: primary_color || '#2563EB'
        })
        .select()
        .single();

      if (createError || !newCompany) {
        return NextResponse.json(
          { success: false, error: 'Error al crear empresa' },
          { status: 500 }
        );
      }
      // Create user-company association
      const { error: assocError } = await clientForWrite
        .from('user_company_associations')
        .insert({
          user_id: user.id,
          company_id: newCompany.id,
          role: 'admin',
          is_active: true
        });
        
      if (assocError) {
        return NextResponse.json(
          { success: false, error: assocError.message || 'Error al asociar usuario con empresa' },
          { status: 500 }
        );
      }

      await syncOrganizationSettings(clientForWrite, user.id, {
        name: newCompany.name,
        primary_color: newCompany.primary_color,
        rfc,
        industry,
        marketplace_category_id,
        marketplace_category_slug,
        marketplace_category_name,
        size,
        tagline,
        phone,
        email,
        website,
        city,
        department,
      });
      await markOrganizationOnboardingComplete(clientForWrite, user.id);

      return NextResponse.json({
        success: true,
        data: newCompany,
        message: 'Empresa creada exitosamente'
      });
    }

    // --- Update via organizations table (primary path) ---
    const clientForUpdate = supabaseAdmin || supabase;
    const { data: existingOrganization } = await clientForUpdate
      .from('organizations')
      .select('id,name,subscription_plan,subscription_status,settings,branding,marketplace_category_id')
      .eq('id', organizationId)
      .maybeSingle();

    if (existingOrganization) {
      const currentSettings = isRecord(existingOrganization.settings)
        ? existingOrganization.settings
        : {};
      const currentBranding = isRecord(existingOrganization.branding)
        ? existingOrganization.branding
        : {};

      const { data: updatedOrganization, error: organizationUpdateError } = await clientForUpdate
        .from('organizations')
        .update({
          name,
          marketplace_category_id,
          settings: {
            ...currentSettings,
            rfc,
            industry,
            marketplace_category_id,
            marketplace_category_slug,
            marketplace_category_name,
            size,
            phone,
            email,
            website,
            city,
            department,
            tagline,
          },
          branding: {
            ...currentBranding,
            primaryColor: primary_color || '#2563EB',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select('id,name,subscription_plan,subscription_status,settings,branding,marketplace_category_id')
        .single();

      if (!organizationUpdateError && updatedOrganization) {
        const updatedBranding = isRecord(updatedOrganization.branding)
          ? updatedOrganization.branding
          : {};

        await syncOrganizationSettings(clientForUpdate, user.id, {
          name: updatedOrganization.name,
          primary_color: stringFromRecord(updatedBranding, 'primaryColor', primary_color || '#2563EB'),
          rfc,
          industry,
          marketplace_category_id,
          marketplace_category_slug,
          marketplace_category_name,
          size,
          tagline,
          phone,
          email,
          website,
          city,
          department,
        }, organizationId);
        await markOrganizationOnboardingComplete(clientForUpdate, user.id, organizationId);

        return NextResponse.json({
          success: true,
          data: organizationToCompanyProfile(updatedOrganization, {
            tagline,
            contact: { phone, email, website },
            address: { city, department },
            legalInfo: { ruc: rfc, economicActivity: industry },
            branding: { primaryColor: primary_color || '#2563EB' },
          }),
          message: 'Empresa actualizada exitosamente',
        });
      }

      // Organization update failed — return error
      const msg = organizationUpdateError?.message || 'Error al actualizar empresa';
      return NextResponse.json(
        { success: false, error: msg },
        { status: 500 }
      );
    }

    // --- Fallback: try legacy companies table ---
    const { data: updatedCompany, error: updateError } = await clientForUpdate
      .from('companies')
      .update({
        name,
        rfc,
        industry,
        size,
        primary_color: primary_color || '#2563EB',
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError || !updatedCompany) {
      const msg = updateError?.message || 'Error al actualizar empresa';
      return NextResponse.json(
        { success: false, error: msg },
        { status: updateError?.code ? 400 : 500 }
      );
    }

    await syncOrganizationSettings(clientForUpdate, user.id, {
      name: updatedCompany.name,
      primary_color: updatedCompany.primary_color,
      rfc,
      industry,
      marketplace_category_id,
      marketplace_category_slug,
      marketplace_category_name,
      size,
      tagline,
      phone,
      email,
      website,
      city,
      department,
    }, organizationId);
    await markOrganizationOnboardingComplete(clientForUpdate, user.id, organizationId);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCompany,
        tagline,
        marketplace_category_id,
        marketplace_category_slug,
        marketplace_category_name,
        phone,
        email,
        website,
        city,
        department,
      },
      message: 'Empresa actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error in PUT /api/company/profile:', error);
    const msg = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
