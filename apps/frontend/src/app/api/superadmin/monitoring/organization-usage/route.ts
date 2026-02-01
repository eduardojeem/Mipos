import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { withCache } from '@/lib/api-cache';

interface OrganizationUsageData {
    organizationId: string;
    organizationName: string;
    dbSizeMb: number | null;
    storageSizeMb: number | null;
    recordCounts: {
        products: number;
        customers: number;
        suppliers: number;
        sales: number;
        saleItems: number;
    };
    activity?: {
        queriesPerMinute: number;
        lastActivity: string | null;
    };
}

/**
 * GET /api/superadmin/monitoring/organization-usage
 * Obtiene métricas de uso por organización
 */
export async function GET(request: NextRequest) {
    // Verificar que el usuario es superadmin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
        return NextResponse.json(auth.body, { status: auth.status });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const forceRefresh = searchParams.get('force') === 'true';
        const includeActivity = searchParams.get('activity') === 'true';

        const cacheKey = `org-usage${includeActivity ? '-with-activity' : ''}`;

        const { data: usageData, cached } = await withCache(
            cacheKey,
            async () => {
                const admin = createAdminClient();

                // 1. Obtener todas las organizaciones
                const { data: organizations, error: orgError } = await admin
                    .from('organizations')
                    .select('id, name, settings')
                    .order('name');

                if (orgError) {
                    throw orgError;
                }

                if (!organizations || organizations.length === 0) {
                    return [];
                }

                // 2. Para cada organización, obtener métricas
                const usagePromises = organizations.map(async (org) => {
                    // Obtener conteo de registros usando la función RPC
                    const { data: countsData } = await admin.rpc('get_organization_record_counts', {
                        org_id: org.id,
                    });

                    const counts = {
                        products: 0,
                        customers: 0,
                        suppliers: 0,
                        sales: 0,
                        saleItems: 0,
                    };

                    countsData?.forEach((row: any) => {
                        const tableName = row.table_name;
                        const count = Number(row.record_count);

                        if (tableName === 'products') counts.products = count;
                        else if (tableName === 'customers') counts.customers = count;
                        else if (tableName === 'suppliers') counts.suppliers = count;
                        else if (tableName === 'sales') counts.sales = count;
                        else if (tableName === 'sale_items') counts.saleItems = count;
                    });

                    // Obtener storage size si está disponible en settings
                    const settings = (org.settings as any) || {};
                    const usage = settings.usage || {};

                    const result: OrganizationUsageData = {
                        organizationId: org.id,
                        organizationName: org.name,
                        dbSizeMb: usage.db_size_mb || null,
                        storageSizeMb: usage.storage_size_mb || null,
                        recordCounts: counts,
                    };

                    // Si se solicita actividad, obtener última venta/movimiento
                    if (includeActivity) {
                        const { data: lastSale } = await admin
                            .from('sales')
                            .select('created_at')
                            .eq('organization_id', org.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();

                        result.activity = {
                            queriesPerMinute: 0, // Placeholder - requeriría pg_stat_statements
                            lastActivity: lastSale?.created_at || null,
                        };
                    }

                    return result;
                });

                const results = await Promise.all(usagePromises);
                return results;
            },
            {
                ttl: 120000, // 2 min
                force: forceRefresh,
            }
        );

        return NextResponse.json(
            {
                success: true,
                data: usageData,
                cached,
                count: usageData.length,
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=120',
                },
            }
        );
    } catch (error: any) {
        console.error('[Organization Usage] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch organization usage',
            },
            { status: 500 }
        );
    }
}
