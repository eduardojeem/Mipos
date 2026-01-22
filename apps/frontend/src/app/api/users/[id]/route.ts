import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin'
import { isMockAuthEnabled } from '@/lib/env'
import { assertAdmin } from '@/app/api/_utils/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertAdmin(request)
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status })
    }
    // Bypass in mock mode for stable Admin UI editing
    if (isMockAuthEnabled()) {
      const { id: userId } = await params;
      const body = await request.json();
      const { name, email, role, password } = body;

      if (!name || !email || !role) {
        return NextResponse.json({ error: 'Nombre, email y rol son requeridos' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const updatedUser = {
        id: userId,
        email,
        name,
        role,
        status: 'active',
        createdAt: now,
        lastLogin: now
      };

      return NextResponse.json({ success: true, user: updatedUser });
    }

    const supabase = await createClient();
    const { id: userId } = await params;
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const userRole = (profile as any)?.role;
    if (!profile || (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Nombre, email y rol son requeridos' }, { status: 400 });
    }

    // Validar tipos explícitamente
    const fullName = String(name);
    const newUserRole = String(role);

    // Crear cliente admin (service role)
    let admin: any
    try {
      admin = createAdminClient()
    } catch (e) {
      console.error('Supabase admin client not configured:', e)
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    // Verificar que el usuario existe usando cliente admin para evitar RLS
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Actualizar en la tabla users usando cliente admin
    const { data: userData, error: userError } = await admin
      .from('users')
      .update({
        full_name: fullName,
        role: newUserRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (userError) {
      console.error('Error updating user:', userError);
      return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
    }

    // Si se proporciona una nueva contraseña, actualizarla en Supabase Auth usando admin
    if (password) {
      const { error: passwordError } = await admin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (passwordError) {
        console.error('Error updating password:', passwordError);
        // No fallar completamente si solo falla la actualización de contraseña
      }
    }

    // Actualizar email en Supabase Auth si es diferente usando admin
    const { error: emailError } = await admin.auth.admin.updateUserById(
      userId,
      { 
        email,
        user_metadata: { full_name: name }
      }
    );

    if (emailError) {
      console.error('Error updating auth email:', emailError);
      // No fallar completamente si solo falla la actualización del email en auth
    }

    // Transformar datos para respuesta
    const updatedUser = {
      id: userData.id,
      email: userData.email,
      name: userData.full_name,
      role: userData.role,
      status: 'active',
      createdAt: userData.created_at,
      lastLogin: userData.updated_at || userData.created_at
    };

    return NextResponse.json({ 
      success: true,
      user: updatedUser 
    });

  } catch (error) {
    console.error('Error in update user API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertAdmin(request)
    if (!('ok' in auth) || auth.ok === false) {
      return NextResponse.json(auth.body, { status: auth.status })
    }
    // Bypass in mock mode to simulate deletion
    if (isMockAuthEnabled()) {
      return NextResponse.json({ 
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    }

    const supabase = await createClient();
    const { id: userId } = await params;
    
    // Verificar autenticación
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const deleteUserRole = (profile as any)?.role;
    if (!profile || (deleteUserRole !== 'ADMIN' && deleteUserRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Crear cliente admin (service role)
    let admin: any
    try {
      admin = createAdminClient()
    } catch (e) {
      console.error('Supabase admin client not configured:', e)
      return NextResponse.json({ error: 'Supabase admin client not configured' }, { status: 500 })
    }

    // Prevenir auto-eliminación
    const { id: requestUserId } = await params;
    if (requestUserId === session.user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 });
    }

    // Verificar que el usuario existe usando cliente admin
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Eliminar de la tabla users usando cliente admin
    const { error: deleteError } = await admin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
    }

    // Eliminar de Supabase Auth usando admin
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // No fallar completamente si solo falla la eliminación en auth
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usuario eliminado exitosamente' 
    });

  } catch (error) {
    console.error('Error in delete user API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
