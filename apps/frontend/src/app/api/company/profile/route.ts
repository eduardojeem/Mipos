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

async function syncOrganizationSettings(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyData: {
    name: string;
    primary_color?: string | null;
  },
  organizationIdOverride?: string | null
) {
  const organizationId = organizationIdOverride || await getUserOrganizationId(userId);

  if (!organizationId) {
    return;
  }

  const now = new Date().toISOString();
  const primaryColor = companyData.primary_color || defaultBusinessConfig.branding.primaryColor;

  await client
    .from('business_config')
    .upsert(
      {
        organization_id: organizationId,
        business_name: companyData.name,
        updated_at: now,
      },
      { onConflict: 'organization_id' }
    );

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

  const mergedConfig = {
    ...defaultBusinessConfig,
    ...currentValue,
    businessName: companyData.name,
    branding: {
      ...defaultBusinessConfig.branding,
      ...((currentValue as { branding?: Record<string, unknown> }).branding || {}),
      primaryColor,
    },
    updatedAt: now,
  };

  await client
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

type OrganizationProfileRow = {
  id: string;
  name: string;
  subscription_plan?: string | null;
  settings?: Record<string, unknown> | null;
  branding?: Record<string, unknown> | null;
};

function organizationToCompanyProfile(organization: OrganizationProfileRow) {
  const settings = isRecord(organization.settings)
    ? organization.settings
    : {};
  const branding = isRecord(organization.branding)
    ? organization.branding
    : {};

  return {
    id: organization.id,
    name: organization.name,
    rfc: stringFromRecord(settings, 'rfc'),
    industry: stringFromRecord(settings, 'industry', 'retail'),
    size: stringFromRecord(settings, 'size', 'micro'),
    logo_url: stringFromRecord(branding, 'logo'),
    primary_color: stringFromRecord(branding, 'primaryColor', '#2563EB'),
    plan_type: String(organization.subscription_plan || 'free').toLowerCase(),
    subscription_start: undefined,
    subscription_end: undefined,
  };
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

    if (requestedOrganizationId && await validateOrganizationMembership(supabaseAdmin, user.id, requestedOrganizationId)) {
      companyId = requestedOrganizationId;
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

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'No se encontró empresa asociada' },
        { status: 404 }
      );
    }

    // Get company profile
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (companyError || !company) {
      const { data: organization, error: organizationError } = await supabaseAdmin
        .from('organizations')
        .select('id,name,subscription_plan,subscription_status,settings,branding')
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
        data: organizationToCompanyProfile(organization),
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
    const { name, rfc, industry, size, primary_color } = body;

    // Validate required fields
    if (!name || !industry || !size) {
      return NextResponse.json(
        { success: false, error: 'Nombre, industria y tamaño son obligatorios' },
        { status: 400 }
      );
    }

    const clientForWrite = supabaseAdmin || supabase;
    const requestedOrganizationId = getRequestedOrganizationId(request);
    let companyId: string | null = null;
    let organizationIdForSettings: string | null = null;

    if (requestedOrganizationId && supabaseAdmin) {
      const membershipOk = await validateOrganizationMembership(supabaseAdmin, user.id, requestedOrganizationId);
      if (membershipOk) {
        companyId = requestedOrganizationId;
        organizationIdForSettings = requestedOrganizationId;
      }
    }

    if (!companyId) {
      const { data: userCompany } = await supabase
        .from('user_company_associations')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      companyId = userCompany?.company_id || null;
    }

    if (!companyId) {
      if (!hasServiceRole) {
        return NextResponse.json(
          { success: false, error: 'No se encontró empresa asociada y falta Service Role para crearla' },
          { status: 403 }
        );
      }
      // Create new company for user
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
      });

      return NextResponse.json({
        success: true,
        data: newCompany,
        message: 'Empresa creada exitosamente'
      });
    }

    // Update existing company
    const clientForUpdate = supabaseAdmin || supabase;
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
      .eq('id', companyId)
      .select()
      .single();

    if (updateError || !updatedCompany) {
      const { data: existingOrganization } = await clientForUpdate
        .from('organizations')
        .select('id,name,subscription_plan,subscription_status,settings,branding')
        .eq('id', companyId)
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
            settings: {
              ...currentSettings,
              rfc,
              industry,
              size,
            },
            branding: {
              ...currentBranding,
              primaryColor: primary_color || '#2563EB',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', companyId)
          .select('id,name,subscription_plan,subscription_status,settings,branding')
          .single();

        if (!organizationUpdateError && updatedOrganization) {
          const updatedBranding = isRecord(updatedOrganization.branding)
            ? updatedOrganization.branding
            : {};

          await syncOrganizationSettings(clientForUpdate, user.id, {
            name: updatedOrganization.name,
            primary_color: stringFromRecord(updatedBranding, 'primaryColor', primary_color || '#2563EB'),
          }, companyId);

          return NextResponse.json({
            success: true,
            data: organizationToCompanyProfile(updatedOrganization),
            message: 'Empresa actualizada exitosamente',
          });
        }
      }

      const msg = updateError?.message || 'Error al actualizar empresa';
      return NextResponse.json(
        { success: false, error: msg },
        { status: updateError?.code ? 400 : 500 }
      );
    }

    await syncOrganizationSettings(clientForUpdate, user.id, {
      name: updatedCompany.name,
      primary_color: updatedCompany.primary_color,
    }, organizationIdForSettings);

    return NextResponse.json({
      success: true,
      data: updatedCompany,
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
