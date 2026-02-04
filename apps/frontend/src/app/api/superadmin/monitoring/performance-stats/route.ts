import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { withCache } from '@/lib/api-cache';

interface SlowQuery {
    query: string;
    calls: number;
    totalTime: number;
    meanTime: number;
    maxTime: number;
}

/**
 * GET /api/superadmin/monitoring/performance-stats
 * Obtiene estadísticas de rendimiento y queries lentas
 * 
 * Requiere que pg_stat_statements esté habilitado
 * Obtiene estadísticas de rendimiento
 */
export async function GET(request: NextRequest) {
    // Verificar que el usuario es superadmin
    const auth = await assertSuperAdmin(request);
    if (!('ok' in auth) || auth.ok === false) {
        return NextResponse.json(auth.body, { status: auth.status });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const forceRefresh = searchParams.get('force') === 'true';
        const limit = parseInt(searchParams.get('limit') || '10');

        const cacheKey = `performance-stats-${limit}`;

        const { data: stats, cached } = await withCache(
            cacheKey,
            async () => {
                const admin = createAdminClient();

                // Verificar si pg_stat_statements está disponible
                const { data: extensionCheck } = await admin.rpc('exec_sql', {
                    sql: `
            SELECT EXISTS (
              SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
            ) as exists;
          `,
                });

                const hasStatStatements = extensionCheck?.[0]?.exists || false;

                let slowQueries: SlowQuery[] = [];

                if (hasStatStatements) {
                    // Obtener queries más lentas
                    const { data: queriesData, error } = await admin.rpc('exec_sql', {
                        sql: `
              SELECT 
                query,
                calls,
                total_exec_time as total_time,
                mean_exec_time as mean_time,
                max_exec_time as max_time
              FROM pg_stat_statements
              WHERE query NOT LIKE '%pg_stat_statements%'
                AND query NOT LIKE '%pg_catalog%'
              ORDER BY mean_exec_time DESC
              LIMIT ${limit};
            `,
                    });

                    if (!error && queriesData) {
                        slowQueries = queriesData.map((row: any) => ({
                            query: row.query.substring(0, 500), // Truncar queries muy largas
                            calls: row.calls,
                            totalTime: Math.round(row.total_time * 100) / 100,
                            meanTime: Math.round(row.mean_time * 100) / 100,
                            maxTime: Math.round(row.max_time * 100) / 100,
                        }));
                    }
                }

                return {
                    hasStatStatements,
                    slowQueries,
                    queriesAnalyzed: slowQueries.length,
                };
            },
            {
                ttl: 600000, // 10 min - datos de performance cambian lentamente
                force: forceRefresh,
            }
        );

        return NextResponse.json({
            success: true,
            data: stats,
            cached,
        });
    } catch (error: any) {
        console.error('[Performance Stats] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch performance stats',
            },
            { status: 500 }
        );
    }
}
