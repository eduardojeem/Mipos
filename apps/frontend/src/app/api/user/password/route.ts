import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password } = body || {};

    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Nota: Supabase no requiere la contraseña actual si la sesión es válida.
    // Si se necesita validar la contraseña actual, se debe implementar un flujo adicional.
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar la contraseña' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}