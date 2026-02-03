import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structuredLogger } from '@/lib/logger';

const COMPONENT = 'SuperAdminOrganizationsAPI';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Role check
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

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

    // Check slug
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', slug).single();
    if (existingOrg) {
      return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 });
    }

    // Prepare settings
    const organizationSettings = {
      ...settings,
      description,
      industry,
      contactInfo: { email, phone, website },
      address: { street: address, city, state, country, postalCode },
      limits: { maxUsers },
      features,
      trial: allowTrialPeriod ? { enabled: true, days: trialDays } : null,
    };

    // Create organization
    const { data: organization, error: orgError } = await supabase
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

    // Invite admin
    const { data: adminUser, error: adminAuthError } = await supabase.auth.admin.inviteUserByEmail(
      adminEmail,
      {
        data: {
          full_name: adminName,
          phone: adminPhone,
          organization_id: organization.id,
          role: 'ADMIN',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    );

    if (adminAuthError) {
      structuredLogger.error('Error inviting admin user', adminAuthError, { component: COMPONENT, action: 'POST_INVITE', metadata: { orgId: organization.id } });
    }

    if (adminUser?.user) {
      const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'ADMIN').single();
      if (adminRole) {
        await supabase.from('organization_members').insert({
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Role check
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Filtering
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    let query = supabase
      .from('organizations')
      .select('*, organization_members(count)', { count: 'exact' });

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
      structuredLogger.error('Error fetching organizations', error, { component: COMPONENT, action: 'GET' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, organizations, total: count });
  } catch (error) {
    structuredLogger.error('Unexpected error in GET organizations', error as Error, { component: COMPONENT, action: 'GET' });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, ids, ...updates } = body;

    if (!id && (!ids || !Array.isArray(ids))) {
      return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    let query = supabase.from('organizations').update(updates);
    
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',');

    if (!id && !ids) return NextResponse.json({ error: 'ID o IDs requeridos' }, { status: 400 });

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single();
    if (userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    let query = supabase.from('organizations').delete();
    
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
