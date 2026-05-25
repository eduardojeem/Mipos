import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { getPlanRecord, syncOrganizationSubscriptionState } from '@/app/api/subscription/_lib';
import { normalizePlanSlug } from '@/lib/plan-catalog';

// Plans whose subscription is provisioned immediately on signup. Anything
// else (paid plans) must go through the billing flow  registration only
// creates the org and the user lands on the upgrade screen.
const FREE_REGISTRATION_PLANS = new Set(['free']);

// Per-instance rate limiting. Supabase Auth has its own per-IP rate limits
// for signUp(), but the org+membership creation here was unthrottled. A bot
// with 100 inboxes could create 100 organizations. This adds a soft guard:
// 5 attempts per IP per 10 min window. For multi-instance deploys (Vercel
// serverless), this is best-effort  a global rate limit needs a shared
// store (Upstash/Redis). Most signup spam comes from the same IP burst,
// which this catches even per-instance.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_MAX_ENTRIES = 1024;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (!entry || entry.resetAt < now) {
        // Evict expired entries opportunistically; cap total store size.
        if (rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
            const oldestKey = rateLimitStore.keys().next().value;
            if (oldestKey !== undefined) rateLimitStore.delete(oldestKey);
        }
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true };
    }

    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }

    entry.count += 1;
    return { allowed: true };
}

async function assignOwnerRole(clientForWrites: any, userId: string, organizationId: string) {
    const { data: ownerRole } = await clientForWrites
        .from('roles')
        .select('id')
        .eq('name', 'OWNER')
        .maybeSingle();

    const roleId = ownerRole?.id;
    if (!roleId) return;

    const { error: membershipRoleError } = await clientForWrites
        .from('organization_members')
        .update({ role_id: roleId })
        .eq('organization_id', organizationId)
        .eq('user_id', userId);

    if (membershipRoleError) {
        console.warn('[register] failed to set membership owner role:', membershipRoleError);
    }

    const baseRoleAssignment = {
        user_id: userId,
        role_id: roleId,
        organization_id: organizationId,
        is_active: true,
    };

    const { error: scopedRoleError } = await clientForWrites
        .from('user_roles')
        .upsert(baseRoleAssignment, { onConflict: 'user_id,role_id,organization_id' });

    if (scopedRoleError) {
        const { error: legacyRoleError } = await clientForWrites
            .from('user_roles')
            .upsert(baseRoleAssignment, { onConflict: 'user_id,role_id' });

        if (legacyRoleError) {
            console.warn('[register] failed to assign owner user_role:', legacyRoleError);
        }
    }
}

function isAlreadyRegisteredError(error: { message?: string } | null | undefined) {
    const message = (error?.message || '').toLowerCase();
    return message.includes('user already registered') ||
        message.includes('already been registered') ||
        message.includes('already registered');
}

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        const rate = checkRateLimit(ip);
        if (!rate.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Demasiados intentos de registro. Proba de nuevo en unos minutos.',
                },
                {
                    status: 429,
                    headers: rate.retryAfterSeconds
                        ? { 'Retry-After': String(rate.retryAfterSeconds) }
                        : undefined,
                }
            );
        }

        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
        const { planSlug } = body;
        const requestedBillingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

        // Validacion de datos
        if (!email || !password || !name || !organizationName) {
            return NextResponse.json({
                success: false,
                error: 'Todos los campos son requeridos'
            }, { status: 400 });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({
                success: false,
                error: 'Email invalido'
            }, { status: 400 });
        }

        // Validar contrasena (minimo 8 caracteres + alguna complejidad).
        // El form muestra un strength meter pero no lo enforzaba en backend.
        if (password.length < 8) {
            return NextResponse.json({
                success: false,
                error: 'La contrasena debe tener al menos 8 caracteres'
            }, { status: 400 });
        }
        const hasLetter = /[A-Za-z]/.test(password);
        const hasNumberOrSymbol = /[\d\W_]/.test(password);
        if (!hasLetter || !hasNumberOrSymbol) {
            return NextResponse.json({
                success: false,
                error: 'La contrasena debe combinar letras y al menos un numero o simbolo'
            }, { status: 400 });
        }

        const supabase = await createClient();
        let admin: any;
        try {
            admin = createAdminClient();
        } catch (e) {
            admin = null;
        }

        // Self-signup always starts on Free. A paid selected plan is stored as
        // intent so billing can activate it later without creating a fake
        // ACTIVE paid subscription.
        const requestedPlanSlug = typeof planSlug === 'string' ? planSlug.toLowerCase() : '';
        const requestedPlan = normalizePlanSlug(requestedPlanSlug || 'free');
        const effectiveSignupPlan = 'free';
        const requiresBilling = requestedPlan !== effectiveSignupPlan;

        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    organization_name: organizationName
                }
            }
        });

        let authUser = authData.user;
        let linkedExistingUser = false;

        if (authError && isAlreadyRegisteredError(authError)) {
            const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signinError || !signinData.user) {
                return NextResponse.json({
                    success: false,
                    error: 'Este email ya tiene una cuenta. Inicia sesion con esa cuenta para crear tu empresa.',
                    code: 'EMAIL_ALREADY_REGISTERED',
                }, { status: 409 });
            }

            authUser = signinData.user;
            linkedExistingUser = true;
        } else if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json({
                success: false,
                error: authError.message
            }, { status: 400 });
        }

        if (!authUser) {
            return NextResponse.json({
                success: false,
                error: 'Error al crear usuario'
            }, { status: 500 });
        }

        // Crear slug unico para la organizacion
        const orgSlug = organizationName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'org';
        // (fallback 'org' previene slugs vacios cuando el nombre es solo simbolos)

        // Crear organizacion
        const clientForWrites = admin || supabase;
        const cleanupAuthUser = async () => {
            if (linkedExistingUser) return;
            if (!admin) return;
            try {
                await admin.auth.admin.deleteUser(authUser.id);
            } catch (cleanupErr) {
                console.error('[register] failed to cleanup auth user after partial signup:', cleanupErr);
            }
        };
        const cleanupOrg = async (orgId: string) => {
            try {
                await clientForWrites.from('organization_members').delete().eq('organization_id', orgId);
                await clientForWrites.from('organizations').delete().eq('id', orgId);
            } catch (cleanupErr) {
                console.error('[register] failed to cleanup org after partial signup:', cleanupErr);
            }
        };

        const { data: orgData, error: orgError } = await clientForWrites
            .from('organizations')
            .insert({
                name: organizationName,
                slug: `${orgSlug}-${Date.now()}`,
                subscription_plan: 'FREE',
                subscription_status: 'ACTIVE',
                settings: {
                    requestedPlan,
                    requestedBillingCycle,
                    requiresBilling,
                    onboardingCompleted: false,
                    signupCompletedAt: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (orgError) {
            console.error('[register] Organization creation error:', orgError);
            await cleanupAuthUser();
            return NextResponse.json({
                success: false,
                error: 'Error al crear la organizacion'
            }, { status: 500 });
        }

        // Agregar usuario como miembro de la organizacion
        const { error: memberError } = await clientForWrites
            .from('organization_members')
            .insert({
                organization_id: orgData.id,
                user_id: authUser.id,
                is_owner: true
            });

        if (memberError) {
            // Reintento idempotente por si un trigger ya creo el row.
            const { error: upsertError } = await clientForWrites
                .from('organization_members')
                .upsert({
                    organization_id: orgData.id,
                    user_id: authUser.id,
                    is_owner: true,
                }, { onConflict: 'organization_id,user_id' });

            if (upsertError) {
                console.error('[register] Membership creation failed (insert + upsert):', upsertError);
                // Rollback parcial: limpiar org y auth user para no dejar
                // organizations huerfanas sin owner ni auth users sin org.
                await cleanupOrg(orgData.id);
                await cleanupAuthUser();
                return NextResponse.json({
                    success: false,
                    error: 'No pudimos crear tu acceso a la organizacion. Intenta de nuevo.',
                }, { status: 500 });
            }
        }

        await assignOwnerRole(clientForWrites, authUser.id, orgData.id);

        // SECURITY: do NOT set role='ADMIN'. Authority over the user's own
        // org comes from organization_members.is_owner = true. Setting global
        // users.role to ADMIN previously gave every signup access to /admin/*
        // routes which list ALL orgs in the system  cross-tenant data leak.
        // 'OWNER' still passes dashboard gates without unlocking SUPER_ADMIN.
        const { error: userUpdateError } = await clientForWrites
            .from('users')
            .update({ organization_id: orgData.id, role: 'OWNER' })
            .eq('id', authUser.id);

        if (userUpdateError) {
            // Posible: el trigger handle_new_user no inserto el row aun.
            const { error: userInsertError } = await clientForWrites
                .from('users')
                .upsert({
                    id: authUser.id,
                    email,
                    full_name: name,
                    role: 'OWNER',
                    organization_id: orgData.id,
                }, { onConflict: 'id' });
            if (userInsertError) {
                console.error('[register] users upsert failed:', userInsertError);
                // No rollback: org y membership ya existen; signin tiene un
                // fallback de legacy users.organization_id si esto falla.
            }
        }

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
                        requestedBillingCycle,
                        requiresBilling,
                        onboardingCompleted: false,
                    },
                },
                plan: freePlan,
                billingCycle: 'monthly',
            });
        } catch (subscriptionError) {
            console.error('[register] Subscription sync failed:', subscriptionError);
            await cleanupOrg(orgData.id);
            await cleanupAuthUser();
            return NextResponse.json({
                success: false,
                error: 'No pudimos activar el plan inicial de la organizacion. Intenta de nuevo.',
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: linkedExistingUser
                ? 'Empresa creada y vinculada a tu cuenta existente.'
                : 'Registro exitoso. Por favor verifica tu email.',
            linkedExistingUser,
            requestedPlan,
            requestedBillingCycle,
            effectivePlan: effectiveSignupPlan,
            requiresBilling,
            user: {
                id: authUser.id,
                email: authUser.email,
                name
            },
            organization: {
                id: orgData.id,
                name: orgData.name
            }
        });

    } catch (error) {
        console.error('Error in register API:', error);
        return NextResponse.json({
            success: false,
            error: 'Error interno del servidor'
        }, { status: 500 });
    }
}
