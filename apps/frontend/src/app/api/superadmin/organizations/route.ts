import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea SUPER_ADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Super Admin.' },
        { status: 403 }
      );
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

    // Validaciones
    if (!name || !slug || !email || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Verificar que el slug no exista
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'El slug ya está en uso. Por favor elige otro.' },
        { status: 400 }
      );
    }

    // Preparar settings JSONB
    const organizationSettings = {
      ...settings,
      description,
      industry,
      contactInfo: {
        email,
        phone,
        website,
      },
      address: {
        street: address,
        city,
        state,
        country,
        postalCode,
      },
      limits: {
        maxUsers,
      },
      features,
      trial: allowTrialPeriod ? {
        enabled: true,
        days: trialDays,
      } : null,
    };

    // Crear la organización
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
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { error: 'Error al crear la organización: ' + orgError.message },
        { status: 500 }
      );
    }

    // Crear el usuario administrador en auth.users (invitación)
    // Nota: Esto requiere permisos de service_role
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
      console.error('Error inviting admin user:', adminAuthError);
      // No fallar completamente, pero registrar el error
      // La organización ya fue creada
    }

    // Si el usuario fue creado, agregarlo como miembro de la organización
    if (adminUser?.user) {
      // Obtener el rol ADMIN
      const { data: adminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'ADMIN')
        .single();

      if (adminRole) {
        // Agregar como miembro de la organización
        await supabase
          .from('organization_members')
          .insert({
            organization_id: organization.id,
            user_id: adminUser.user.id,
            role_id: adminRole.id,
            is_owner: true,
          });
      }
    }

    return NextResponse.json({
      success: true,
      organization,
      message: 'Organización creada exitosamente',
    });

  } catch (error) {
    console.error('Error in POST /api/superadmin/organizations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario sea SUPER_ADMIN
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Se requieren permisos de Super Admin.' },
        { status: 403 }
      );
    }

    // Obtener todas las organizaciones con conteo de miembros
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members (
          count
        )
      `)
      .order('created_at', { ascending: false });

    if (orgsError) {
      console.error('Error fetching organizations:', orgsError);
      return NextResponse.json(
        { error: 'Error al obtener organizaciones' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organizations,
    });

  } catch (error) {
    console.error('Error in GET /api/superadmin/organizations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
