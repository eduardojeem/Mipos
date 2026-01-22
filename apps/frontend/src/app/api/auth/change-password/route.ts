import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación con getUser
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: 'La contraseña actual y nueva son requeridas' 
      }, { status: 400 });
    }

    // Validar fortaleza de la nueva contraseña
    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'La nueva contraseña debe tener al menos 8 caracteres' 
      }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'El usuario no tiene email asociado' }, { status: 400 });
    }

    // Verificar contraseña actual intentando hacer login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (signInError) {
      return NextResponse.json({ 
        error: 'La contraseña actual es incorrecta' 
      }, { status: 400 });
    }

    // Cambiar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Error al cambiar la contraseña' 
      }, { status: 400 });
    }

    // Registrar cambio en logs de auditoría (opcional)
    // Comentado temporalmente hasta configurar la tabla audit_logs en Supabase
    /*
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'password_changed',
          resource: 'user_profile',
          details: { message: 'Usuario cambió su contraseña' }
        });
    } catch (auditError) {
      console.warn('Could not log password change to audit logs:', auditError);
      // No fallar si no se puede registrar en audit logs
    }
    */

    return NextResponse.json({ 
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error in change password API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}