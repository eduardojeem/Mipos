import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { withCache } from '@/lib/api-cache';

interface DatabaseStats {
    totalSize: {
        bytes: number;
        pretty: string;
    };
    performance: {
        cacheHitRatio: number;
        activeConnections: number;
        idleConnections: number;
        transactionsCommitted: number;
        transactionsRolledBack: number;
    };
    largestTables?: Array<{
        tableName: string;
        sizeBytes: number;
        sizePretty: string;
        rowCount: number;
    }>;
    unusedIndexes?: Array<{
        schemaName: string;
        tableName: string;
        indexName: string;
        sizePretty: string;
    }>;
}

/**
 * GET /api/superadmin/monitoring/database-stats
 * Obtiene estadísticas de la base de datos
 * 
 * Query params:
 * - mode: 'light' | 'standard' | 'full' (default: 'standard')
 * - force: 'true' para bypass cache (default: 'false')
 */
export async function GET(request: NextRequest) {
    // Verificar que el usuario es superadmin
    const auth = await assertAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
        return NextResponse.json(auth.body, { status: auth.status });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('mode') || 'standard';
        const forceRefresh = searchParams.get('force') === 'true';

        const cacheKey = `db-stats-${mode}`;
        const cacheTTL = mode === 'light' ? 300000 : mode === 'standard' ? 180000 : 60000;

        const { data: stats, cached } = await withCache(
            cacheKey,
            async () => {
                const admin = createAdminClient();

                // 1. Obtener tamaño total de la base de datos
                const { data: dbSizeData } = await admin.rpc('exec_sql', {
                    sql: `
            SELECT pg_database_size(current_database()) as bytes,
                   pg_size_pretty(pg_database_size(current_database())) as pretty;
          `,
                });

                const totalSize = dbSizeData?.[0] || { bytes: 0, pretty: '0 bytes' };

                // 2. Obtener métricas de performance
                const { data: perfData } = await admin.rpc('get_database_performance_metrics');

                const performance = {
                    cacheHitRatio: perfData?.find((m: any) => m.metric_name === 'cache_hit_ratio')?.metric_value || 0,
                    activeConnections: perfData?.find((m: any) => m.metric_name === 'active_connections')?.metric_value || 0,
                    idleConnections: perfData?.find((m: any) => m.metric_name === 'idle_connections')?.metric_value || 0,
                    transactionsCommitted: perfData?.find((m: any) => m.metric_name === 'transactions_committed')?.metric_value || 0,
                    transactionsRolledBack: perfData?.find((m: any) => m.metric_name === 'transactions_rolled_back')?.metric_value || 0,
                };

                const result: DatabaseStats = {
                    totalSize,
                    performance,
                };

                // 3. Si es modo standard o full, obtener tablas más grandes
                if (mode === 'standard' || mode === 'full') {
                    const { data: tablesData } = await admin.rpc('get_largest_tables', {
                        limit_count: mode === 'full' ? 50 : 20
                    });

                    result.largestTables = tablesData || [];
                }

                // 4. Si es modo full, obtener índices no utilizados
                if (mode === 'full') {
                    const { data: indexesData } = await admin.rpc('get_unused_indexes');
                    result.unusedIndexes = indexesData || [];
                }

                return result;
            },
            {
                ttl: cacheTTL,
                force: forceRefresh,
            }
        );

        return NextResponse.json(
            {
                success: true,
                data: stats,
                cached,
                mode,
            },
            {
                headers: {
                    'Cache-Control': `public, max-age=${cacheTTL / 1000}`,
                },
            }
        );
    } catch (error: any) {
        console.error('[Database Stats] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch database stats',
            },
            { status: 500 }
        );
    }
}
