import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';
import {
  DEFAULT_PASSWORD_POLICY,
  getPasswordPolicyForUser,
  validatePasswordAgainstPolicy,
} from '@/app/api/_utils/password-policy';

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
      return NextResponse.json({ error: 'Debes ingresar tu contrasena actual' }, { status: 400 });
    }

    if (!new_password || typeof new_password !== 'string') {
      return NextResponse.json({ error: 'Debes ingresar una nueva contrasena' }, { status: 400 });
    }

    let passwordPolicy = DEFAULT_PASSWORD_POLICY;
    try {
      const adminClient = await createAdminClient();
      passwordPolicy = await getPasswordPolicyForUser(adminClient, user.id);
    } catch (policyError) {
      console.warn('Could not load organization password policy, using defaults:', policyError);
    }

    const policyError = validatePasswordAgainstPolicy(new_password, passwordPolicy);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'No se pudo validar tu identidad (email faltante)' }, { status: 400 });
    }

    const cfg = getSupabaseConfig();
    if (!cfg) {
      return NextResponse.json({ error: 'Supabase no esta configurado' }, { status: 500 });
    }

    const verifier = createSupabaseJsClient(cfg.url, cfg.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: current_password,
    });

    if (signInError) {
      return NextResponse.json({ error: 'La contrasena actual es incorrecta' }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: 'No se pudo actualizar la contrasena' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Contrasena actualizada correctamente' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
