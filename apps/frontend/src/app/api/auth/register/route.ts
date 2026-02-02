import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
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

        // Validar contraseña (mínimo 6 caracteres)
        if (password.length < 6) {
            return NextResponse.json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres'
            }, { status: 400 });
        }

        const supabase = await createClient();

        // Verificar si el plan existe
        let planId = null;
        if (planSlug) {
            const { data: plan, error: planError } = await supabase
                .from('saas_plans')
                .select('id')
                .eq('slug', planSlug)
                .eq('is_active', true)
                .single();

            if (planError || !plan) {
                return NextResponse.json({
                    success: false,
                    error: 'Plan de suscripción no válido'
                }, { status: 400 });
            }
            planId = plan.id;
        }

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
            .replace(/^-+|-+$/g, '');

        // Crear organización
        const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert({
                name: organizationName,
                slug: `${orgSlug}-${Date.now()}`, // Asegurar unicidad
                subscription_plan: planSlug?.toUpperCase() || 'FREE',
                subscription_status: 'ACTIVE'
            })
            .select()
            .single();

        if (orgError) {
            console.error('Organization creation error:', orgError);
            // Si falla la creación de la org, intentar eliminar el usuario creado
            await supabase.auth.admin.deleteUser(authData.user.id).catch(console.error);

            return NextResponse.json({
                success: false,
                error: 'Error al crear la organización'
            }, { status: 500 });
        }

        // Agregar usuario como miembro de la organización
        const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
                organization_id: orgData.id,
                user_id: authData.user.id,
                is_owner: true
            });

        if (memberError) {
            console.error('Member creation error:', memberError);
        }

        // Si hay un plan seleccionado, crear la suscripción
        if (planId) {
            const now = new Date();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 mes de período inicial

            const { error: subError } = await supabase
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
