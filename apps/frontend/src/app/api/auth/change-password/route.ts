import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import {
  DEFAULT_PASSWORD_POLICY,
  getPasswordPolicyForUser,
  validatePasswordAgainstPolicy,
} from '@/app/api/_utils/password-policy';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        error: 'La contrasena actual y nueva son requeridas',
      }, { status: 400 });
    }

    let passwordPolicy = DEFAULT_PASSWORD_POLICY;
    try {
      const adminClient = await createAdminClient();
      passwordPolicy = await getPasswordPolicyForUser(adminClient, user.id);
    } catch (policyError) {
      console.warn('Could not load organization password policy, using defaults:', policyError);
    }

    const policyError = validatePasswordAgainstPolicy(newPassword, passwordPolicy);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'El usuario no tiene email asociado' }, { status: 400 });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json({
        error: 'La contrasena actual es incorrecta',
      }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({
        error: updateError.message || 'Error al cambiar la contrasena',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contrasena actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error in change password API:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
    }, { status: 500 });
  }
}
