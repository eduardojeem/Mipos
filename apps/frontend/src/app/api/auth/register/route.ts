import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase-admin';

// Plans whose subscription is provisioned immediately on signup. Anything
// else (paid plans) must go through the billing flow — registration only
// creates the org and the user lands on the upgrade screen.
const FREE_REGISTRATION_PLANS = new Set(['free']);

// Per-instance rate limiting. Supabase Auth has its own per-IP rate limits
// for signUp(), but the org+membership creation here was unthrottled. A bot
// with 100 inboxes could create 100 organizations. This adds a soft guard:
// 5 attempts per IP per 10 min window. For multi-instance deploys (Vercel
// serverless), this is best-effort — a global rate limit needs a shared
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

export async function POST(request: NextRequest) {
    try {
        const ip = getClientIp(request);
        const rate = checkRateLimit(ip);
        if (!rate.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Demasiados intentos de registro. Probá de nuevo en unos minutos.',
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
        const { email, password, name, organizationName, planSlug } = body;

        // Validación de datos
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
                error: 'Email inválido'
            }, { status: 400 });
        }

        // Validar contraseña (mínimo 8 caracteres + alguna complejidad).
        // El form muestra un strength meter pero no lo enforzaba en backend.
        if (password.length < 8) {
            return NextResponse.json({
                success: false,
                error: 'La contraseña debe tener al menos 8 caracteres'
            }, { status: 400 });
        }
        const hasLetter = /[A-Za-z]/.test(password);
        const hasNumberOrSymbol = /[\d\W_]/.test(password);
        if (!hasLetter || !hasNumberOrSymbol) {
            return NextResponse.json({
                success: false,
                error: 'La contraseña debe combinar letras y al menos un número o símbolo'
            }, { status: 400 });
        }

        const supabase = await createClient();
        let admin: any;
        try {
            admin = createAdminClient();
        } catch (e) {
            admin = null;
        }

        // Verificar si el plan existe (optional — don't block registration if plan not found).
        // SECURITY: only honor free plans here. Paid plan provisioning must go
        // through the billing/Stripe flow; otherwise a curl with planSlug=
        // 'professional' would activate a paid subscription for free.
        let planId = null;
        const requestedPlanSlug = typeof planSlug === 'string' ? planSlug.toLowerCase() : '';
        const isAllowedSignupPlan = !requestedPlanSlug || FREE_REGISTRATION_PLANS.has(requestedPlanSlug);
        if (requestedPlanSlug && isAllowedSignupPlan) {
            const { data: plan } = await (admin || supabase)
                .from('saas_plans')
                .select('id, price_monthly')
                .eq('slug', requestedPlanSlug)
                .eq('is_active', true)
                .single();

            // Defense-in-depth: even if the slug allowlist is bypassed, refuse
            // to provision plans whose price > 0 from this endpoint.
            if (plan && Number(plan.price_monthly || 0) === 0) {
                planId = plan.id;
            }
        }
        // For paid plans (or unknown slugs) we silently fall back to no
        // subscription — the org gets created and billing must be activated
        // separately. The frontend should route paid plans to billing first.

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

        if (authError) {
            console.error('Auth error:', authError);
            return NextResponse.json({
                success: false,
                error: authError.message === 'User already registered'
                    ? 'Este email ya está registrado'
                    : authError.message
            }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({
                success: false,
                error: 'Error al crear usuario'
            }, { status: 500 });
        }

        // Crear slug único para la organización
        const orgSlug = organizationName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'org';
        // (fallback 'org' previene slugs vacíos cuando el nombre es solo símbolos)

        // Crear organización
        const clientForWrites = admin || supabase;
        const cleanupAuthUser = async () => {
            if (!admin) return;
            try {
                await admin.auth.admin.deleteUser(authData.user.id);
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
                subscription_plan: requestedPlanSlug || 'free',
                subscription_status: 'ACTIVE'
            })
            .select()
            .single();

        if (orgError) {
            console.error('[register] Organization creation error:', orgError);
            await cleanupAuthUser();
            return NextResponse.json({
                success: false,
                error: 'Error al crear la organización'
            }, { status: 500 });
        }

        // Agregar usuario como miembro de la organización
        const { error: memberError } = await clientForWrites
            .from('organization_members')
            .insert({
                organization_id: orgData.id,
                user_id: authData.user.id,
                is_owner: true
            });

        if (memberError) {
            // Reintento idempotente por si un trigger ya creó el row.
            const { error: upsertError } = await clientForWrites
                .from('organization_members')
                .upsert({
                    organization_id: orgData.id,
                    user_id: authData.user.id,
                    is_owner: true,
                }, { onConflict: 'organization_id,user_id' });

            if (upsertError) {
                console.error('[register] Membership creation failed (insert + upsert):', upsertError);
                // Rollback parcial: limpiar org y auth user para no dejar
                // organizations huérfanas sin owner ni auth users sin org.
                await cleanupOrg(orgData.id);
                await cleanupAuthUser();
                return NextResponse.json({
                    success: false,
                    error: 'No pudimos crear tu acceso a la organización. Intentá de nuevo.',
                }, { status: 500 });
            }
        }

        // SECURITY: do NOT set role='ADMIN'. Authority over the user's own
        // org comes from organization_members.is_owner = true. Setting global
        // users.role to ADMIN previously gave every signup access to /admin/*
        // routes which list ALL orgs in the system — cross-tenant data leak.
        // 'OWNER' still passes dashboard gates without unlocking SUPER_ADMIN.
        const { error: userUpdateError } = await clientForWrites
            .from('users')
            .update({ organization_id: orgData.id, role: 'OWNER' })
            .eq('id', authData.user.id);

        if (userUpdateError) {
            // Posible: el trigger handle_new_user no insertó el row aún.
            const { error: userInsertError } = await clientForWrites
                .from('users')
                .upsert({
                    id: authData.user.id,
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

        // Si hay un plan seleccionado, crear la suscripción
        if (planId) {
            const now = new Date();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mes de período inicial

            const { error: subError } = await clientForWrites
                .from('saas_subscriptions')
                .insert({
                    organization_id: orgData.id,
                    plan_id: planId,
                    status: 'active',
                    billing_cycle: 'monthly',
                    current_period_start: now.toISOString(),
                    current_period_end: periodEnd.toISOString()
                });

            if (subError) {
                console.error('Subscription creation error:', subError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Registro exitoso. Por favor verifica tu email.',
            user: {
                id: authData.user.id,
                email: authData.user.email,
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
