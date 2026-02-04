import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/app/api/_utils/auth';

export async function GET(request: NextRequest) {
  const auth = await assertAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { userId, organizationId } = auth;

  try {
    const supabase = await createClient();

    // Obtener perfil del usuario desde la tabla users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        phone,
        bio,
        location,
        avatar,
        created_at,
        updated_at,
        last_login
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching admin profile:', profileError);
      return NextResponse.json(
        { error: 'Error al obtener perfil' },
        { status: 500 }
      );
    }

    // Obtener información de la organización
    let organizationInfo = null;
    if (organizationId) {
      const { data: orgData } = await supabase
        .from('organization_members')
        .select(`
          role_id,
          is_owner,
          organization:organizations(
            id,
            name,
            slug,
            subscription_plan,
            subscription_status,
            settings
          )
        `)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      organizationInfo = orgData;
    }

    // Obtener permisos del usuario
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          name,
          permissions (
            name,
            resource,
            action
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    let permissions: string[] = [];
    if (!rolesError && userRoles) {
      permissions = userRoles.flatMap(ur => 
        (ur.roles as any)?.permissions?.map((p: any) => `${p.resource}.${p.action}`) || []
      );
    }

    // Obtener actividad reciente (filtrada por organización)
    let activityQuery = supabase
      .from('role_audit_logs')
      .select('action, resource_type, created_at, ip_address')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filtrar actividad por organización si aplica
    if (organizationId) {
      activityQuery = activityQuery.eq('organization_id', organizationId);
    }

    const { data: recentActivity } = await activityQuery;

    const adminProfile = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      phone: profile.phone,
      bio: profile.bio,
      location: profile.location,
      avatar: profile.avatar,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      lastLogin: profile.last_login,
      permissions: permissions,
      recentActivity: recentActivity || [],
      organization: organizationInfo,
      twoFactorEnabled: false, // TODO: Implementar 2FA
    };

    return NextResponse.json(adminProfile);
  } catch (error) {
    console.error('Admin profile API error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await assertAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { userId, organizationId } = auth;

  try {
    const supabase = await createClient();
    const updates = await request.json();

    // Validar que solo se actualicen campos permitidos
    const allowedFields = ['full_name', 'phone', 'bio', 'location', 'avatar'];
    const filteredUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // Agregar timestamp de actualización
    filteredUpdates.updated_at = new Date().toISOString();

    // Actualizar perfil en la base de datos
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating admin profile:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar perfil' },
        { status: 500 }
      );
    }

    // Registrar la acción en el log de auditoría con organization_id
    await supabase
      .from('role_audit_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        action: 'UPDATE',
        resource_type: 'profile',
        resource_id: userId,
        old_values: {},
        new_values: filteredUpdates,
        performed_by: userId,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Perfil actualizado correctamente'
    });
  } catch (error) {
    console.error('Admin profile update error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para cambiar contraseña
export async function PATCH(request: NextRequest) {
  const auth = await assertAdmin(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { userId, organizationId } = auth;

  try {
    const supabase = await createClient();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Contraseña actual y nueva son requeridas' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Obtener email del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!userData?.email) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar contraseña actual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: currentPassword
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Contraseña actual incorrecta' },
        { status: 400 }
      );
    }

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar contraseña' },
        { status: 500 }
      );
    }

    // Registrar cambio de contraseña en el log de auditoría con organization_id
    await supabase
      .from('role_audit_logs')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        action: 'PASSWORD_CHANGE',
        resource_type: 'auth',
        resource_id: userId,
        old_values: {},
        new_values: { password_changed: true },
        performed_by: userId,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}