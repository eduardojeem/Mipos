import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Verify email for newly registered organization.
 * Called after user clicks email link or enters confirmation code.
 *
 * This endpoint:
 * 1. Verifies the email is legitimate
 * 2. Marks the organization as email_verified
 * 3. Enables full access to the platform
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, code } = body;

    // Validate input
    if (!token && !code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token o código de verificación es requerido',
          code: 'MISSING_VERIFICATION_TOKEN',
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID es requerido',
          code: 'MISSING_USER_ID',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let admin: any;
    try {
      admin = createAdminClient();
    } catch (e) {
      admin = null;
    }

    const clientForWrites = admin || supabase;

    // Method 1: Verify via Supabase Auth email confirmation
    if (token) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (verifyError) {
        console.error('[verify-email] Auth verification error:', verifyError);
        return NextResponse.json(
          {
            success: false,
            error: 'Token de verificación inválido o expirado',
            code: 'INVALID_TOKEN',
          },
          { status: 400 }
        );
      }
    }

    // Method 2: Verify via confirmation code (alternative flow)
    if (code) {
      const { data: verification, error: codeError } = await clientForWrites
        .from('email_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .eq('verified_at', null)
        .maybeSingle();

      if (codeError || !verification) {
        console.error('[verify-email] Code verification error:', codeError);
        return NextResponse.json(
          {
            success: false,
            error: 'Código de verificación inválido o expirado',
            code: 'INVALID_CODE',
          },
          { status: 400 }
        );
      }

      // Check if code is expired (valid for 24 hours)
      const createdAt = new Date(verification.created_at).getTime();
      const now = Date.now();
      const expiresIn = 24 * 60 * 60 * 1000; // 24 hours

      if (now - createdAt > expiresIn) {
        return NextResponse.json(
          {
            success: false,
            error: 'Código de verificación expirado',
            code: 'CODE_EXPIRED',
          },
          { status: 400 }
        );
      }

      // Mark code as verified
      const { error: updateCodeError } = await clientForWrites
        .from('email_verification_codes')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', verification.id);

      if (updateCodeError) {
        console.error('[verify-email] Failed to mark code as verified:', updateCodeError);
        // Non-critical, continue
      }
    }

    // Get user's organization
    const { data: user, error: userError } = await clientForWrites
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      console.error('[verify-email] User lookup error:', userError);
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Mark organization as email verified
    const { error: orgError } = await clientForWrites
      .from('organizations')
      .update({
        settings: {
          emailVerified: true,
        },
      })
      .eq('id', user.organization_id);

    if (orgError) {
      console.error('[verify-email] Organization update error:', orgError);
      return NextResponse.json(
        {
          success: false,
          error: 'No pudimos verificar tu email. Por favor intenta de nuevo.',
          code: 'ORG_UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    // Update user verification status
    const { error: userUpdateError } = await clientForWrites
      .from('users')
      .update({ email_verified: true })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('[verify-email] User update error:', userUpdateError);
      // Non-critical, organization already verified
    }

    return NextResponse.json({
      success: true,
      message: 'Email verificado exitosamente. Bienvenido a tu negocio online.',
      user: {
        id: userId,
        emailVerified: true,
      },
      organization: {
        id: user.organization_id,
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error('[verify-email] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Resend verification email or code
 * Called if user didn't receive the initial email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID y email son requeridos',
          code: 'MISSING_PARAMS',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let admin: any;
    try {
      admin = createAdminClient();
    } catch (e) {
      admin = null;
    }

    // Resend verification email via Supabase Auth
    const { error: resendError } = await supabase.auth.resendEnvelopeEmail(
      {
        email,
        type: 'signup',
      }
    );

    if (resendError) {
      console.error('[verify-email] Resend error:', resendError);
      return NextResponse.json(
        {
          success: false,
          error: 'No pudimos enviar el email de verificación. Intenta de nuevo en unos minutos.',
          code: 'RESEND_FAILED',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email de verificación enviado. Por favor revisa tu bandeja de entrada.',
      email,
    });
  } catch (error) {
    console.error('[verify-email] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
