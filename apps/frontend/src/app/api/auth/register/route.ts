import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getPlanRecord, syncOrganizationSubscriptionState } from '@/app/api/subscription/_lib';
import { normalizePlanSlug } from '@/lib/plan-catalog';
import { resolveSignupVertical } from './vertical';
import { sendEmail, buildWelcomeEmail } from '@/lib/email';
import {
  validateSignupInput,
  createOrganizationWithMembership,
  assignOwnerRole,
  updateUserRecord,
  checkEmailExists,
} from './signup-service';
import { redisRateLimiter } from './rate-limiter-redis';
import { TERMS_VERSION } from '@/lib/legal/terms';

// Plans whose subscription is provisioned immediately on signup. Anything
// else (paid plans) must go through the billing flow  registration only
// creates the org and the user lands on the upgrade screen.
const FREE_REGISTRATION_PLANS = new Set(['free']);

function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return headers.get('x-real-ip') || 'unknown';
}

function isAlreadyRegisteredError(error: { message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('already registered')
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (Redis or in-memory fallback)
    const ip = getClientIp(request.headers);
    const rateCheck = await redisRateLimiter.check(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demasiados intentos de registro. Proba de nuevo en unos minutos.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: rateCheck.retryAfterSeconds
            ? { 'Retry-After': String(rateCheck.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // Parse and normalize input
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
    const planSlug = typeof body.planSlug === 'string' ? body.planSlug.toLowerCase() : 'free';
    const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // Validate vertical
    const verticalResult = resolveSignupVertical(body.vertical);
    if (!verticalResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: verticalResult.error,
          code: 'INVALID_VERTICAL',
        },
        { status: 400 }
      );
    }

    const vertical = verticalResult.vertical;

    // Comprehensive input validation
    const validationErrors = validateSignupInput({
      email,
      password,
      name,
      organizationName,
      vertical,
      planSlug,
      billingCycle,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validaci\u00f3n fallida',
          code: 'VALIDATION_FAILED',
          errors: validationErrors,
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

    // Check if email already exists - prevent multiple orgs per email
    const emailExists = await checkEmailExists(supabase, email);
    if (emailExists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Este email ya tiene una cuenta registrada. Por favor inicia sesi\u00f3n o crea una nueva cuenta con otro email.',
          code: 'EMAIL_ALREADY_REGISTERED',
        },
        { status: 409 }
      );
    }

    // Plan validation
    const requestedPlan = normalizePlanSlug(planSlug);
    const effectiveSignupPlan = 'free';
    const requiresBilling = requestedPlan !== effectiveSignupPlan;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          organization_name: organizationName,
        },
      },
    });

    if (authError) {
      console.error('[register] Auth error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No pudimos crear tu usuario. Por favor intenta de nuevo.',
          code: 'AUTH_CREATION_FAILED',
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Error al crear usuario',
          code: 'AUTH_USER_NOT_CREATED',
        },
        { status: 500 }
      );
    }

    const authUser = authData.user;
    const clientForWrites = admin || supabase;

    // Cleanup helpers
    const cleanupAuthUser = async () => {
      if (!admin) return;
      try {
        await admin.auth.admin.deleteUser(authUser.id);
      } catch (cleanupErr) {
        console.error('[register] Cleanup error - auth user:', cleanupErr);
      }
    };

    const cleanupOrg = async (orgId: string) => {
      try {
        await clientForWrites.from('organization_members').delete().eq('organization_id', orgId);
        await clientForWrites.from('organizations').delete().eq('id', orgId);
      } catch (cleanupErr) {
        console.error('[register] Cleanup error - organization:', cleanupErr);
      }
    };

    // Create organization with membership
    let orgData;
    try {
      orgData = await createOrganizationWithMembership(
        supabase,
        admin,
        authUser.id,
        organizationName,
        vertical,
        requestedPlan,
        billingCycle
      );
    } catch (orgError) {
      console.error('[register] Organization creation error:', orgError);
      await cleanupAuthUser();
      return NextResponse.json(
        {
          success: false,
          error: 'No pudimos crear tu empresa. Por favor intenta de nuevo.',
          code: 'ORG_CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    // Assign owner role
    try {
      await assignOwnerRole(clientForWrites, authUser.id, orgData.id);
    } catch (roleError) {
      console.error('[register] Role assignment error:', roleError);
      // Non-critical, continue
    }

    // Update user record
    try {
      await updateUserRecord(clientForWrites, authUser.id, email, name, orgData.id);
    } catch (userError) {
      console.error('[register] User update error:', userError);
      // Non-critical, org already exists
    }

    // Sync subscription
    try {
      const freePlan = await getPlanRecord('free');
      if (!freePlan) {
        throw new Error('Plan free no encontrado');
      }
      await syncOrganizationSubscriptionState({
        organization: {
          ...orgData,
          settings: {
            ...(orgData.settings || {}),
            requestedPlan,
            requestedBillingCycle: billingCycle,
            requiresBilling,
            onboardingCompleted: false,
            emailVerified: false,
          },
        },
        plan: freePlan,
        billingCycle: 'monthly',
      });
    } catch (subscriptionError) {
      console.error('[register] Subscription sync error:', subscriptionError);
      await cleanupOrg(orgData.id);
      await cleanupAuthUser();
      return NextResponse.json(
        {
          success: false,
          error: 'No pudimos configurar tu plan. Por favor intenta de nuevo.',
          code: 'SUBSCRIPTION_SYNC_FAILED',
        },
        { status: 500 }
      );
    }

    // Send welcome email with verification link
    const verifyUrl = `${request.nextUrl.origin}/verify-email?userId=${authUser.id}&email=${encodeURIComponent(email)}`;
    const welcomeEmail = buildWelcomeEmail({
      userName: name,
      organizationName,
      loginUrl: `${request.nextUrl.origin}/onboarding`,
      verifyUrl,
    });
    sendEmail({ to: email, ...welcomeEmail, template: 'welcome' }).catch((err) => {
      console.error('[register] Email send error:', err);
      // Non-critical
    });

    // Record terms acceptance (implied by completing signup). Best-effort:
    // must not block signup if the terms_acceptances table is not migrated yet.
    try {
      const { error: termsErr } = await clientForWrites.from('terms_acceptances').insert({
        user_id: authUser.id,
        organization_id: orgData.id,
        terms_version: TERMS_VERSION,
        source: 'signup',
        ip,
        user_agent: request.headers.get('user-agent') || null,
      });
      if (termsErr) {
        console.warn('[register] Could not record terms acceptance (non-critical):', termsErr.message);
      }
    } catch (termsErr) {
      console.warn('[register] Terms acceptance insert threw (non-critical):', termsErr);
    }

    // Reset rate limit after successful signup (async, non-blocking)
    redisRateLimiter.reset(ip).catch((err) => {
      console.error('[register] Failed to reset rate limit:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email para acceder a tu cuenta.',
      requestedPlan,
      requestedBillingCycle: billingCycle,
      effectivePlan: effectiveSignupPlan,
      requiresBilling,
      user: {
        id: authUser.id,
        email: authUser.email,
        name,
      },
      organization: {
        id: orgData.id,
        name: orgData.name,
        vertical,
      },
    });
  } catch (error) {
    console.error('[register] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor. Por favor intenta de nuevo.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
