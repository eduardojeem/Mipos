import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { MonitoringSettings, DEFAULT_MONITORING_CONFIG } from '@/lib/monitoring-config';

/**
 * GET /api/superadmin/monitoring/config
 * Obtiene la configuración actual de monitorización
 */
export async function GET(request: NextRequest) {
    // Verificar que el usuario es superadmin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
        return NextResponse.json(auth.body, { status: auth.status });
    }

    try {
        const admin = createAdminClient();

        // Obtener configuración desde la BD
        const { data, error } = await admin
            .from('superadmin_settings')
            .select('setting_value')
            .eq('setting_key', 'monitoring_config')
            .single();

        if (error) {
            // Si no existe, retornar configuración por defecto
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: true,
                    config: DEFAULT_MONITORING_CONFIG,
                });
            }

            throw error;
        }

        return NextResponse.json({
            success: true,
            config: data.setting_value as MonitoringSettings,
        });
    } catch (error: any) {
        console.error('[Monitoring Config GET] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch monitoring config',
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/superadmin/monitoring/config
 * Actualiza la configuración de monitorización
 */
export async function POST(request: NextRequest) {
    // Verificar que el usuario es superadmin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
        return NextResponse.json(auth.body, { status: auth.status });
    }

    try {
        const body = await request.json();
        const { config } = body as { config: MonitoringSettings };

        // Validar configuración
        if (!config || !config.mode) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid configuration',
                },
                { status: 400 }
            );
        }

        const admin = createAdminClient();

        // Upsert configuración en la BD
        const { data, error } = await admin
            .from('superadmin_settings')
            .upsert(
                {
                    setting_key: 'monitoring_config',
                    setting_value: config,
                },
                {
                    onConflict: 'setting_key',
                }
            )
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            config: data.setting_value as MonitoringSettings,
            message: 'Monitoring configuration updated successfully',
        });
    } catch (error: any) {
        console.error('[Monitoring Config POST] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to update monitoring config',
            },
            { status: 500 }
        );
    }
}
