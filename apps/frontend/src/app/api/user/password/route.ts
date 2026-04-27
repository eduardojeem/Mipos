import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { current_password, new_password } = body || {};

    if (!current_password || typeof current_password !== 'string') {
      return NextResponse.json({ error: 'Debes ingresar tu contraseña actual' }, { status: 400 });
    }

    if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'No se pudo validar tu identidad (email faltante)' }, { status: 400 });
    }

    const cfg = getSupabaseConfig();
    if (!cfg) {
      return NextResponse.json({ error: 'Supabase no está configurado' }, { status: 500 });
    }

    const verifier = createSupabaseJsClient(cfg.url, cfg.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (signInError) {
      return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 });
    }

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
