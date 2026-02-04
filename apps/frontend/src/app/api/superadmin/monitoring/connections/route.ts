import { NextRequest, NextResponse } from 'next/server';
import { assertSuperAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { withCache } from '@/lib/api-cache';

interface ActiveConnection {
    pid: number;
    user: string;
    database: string;
    state: string;
    query: string;
    duration: number;
    waitEvent: string | null;
}

/**
 * GET /api/superadmin/monitoring/connections
 * Obtiene información sobre las conexiones activas
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
        const state = searchParams.get('state'); // 'active', 'idle', etc.

        const cacheKey = `connections${state ? `-${state}` : ''}`;

        const { data: connections, cached } = await withCache(
            cacheKey,
            async () => {
                const admin = createAdminClient();

                // Query pg_stat_activity
                let sql = `
          SELECT 
            pid,
            usename as user,
            datname as database,
            state,
            COALESCE(query, '<no query>') as query,
            EXTRACT(EPOCH FROM (now() - query_start)) as duration,
            wait_event
          FROM pg_stat_activity
          WHERE datname = current_database()
            AND pid != pg_backend_pid()
        `;

                // Filtrar por estado si se especifica
                if (state) {
                    sql += ` AND state = '${state}'`;
                }

                sql += ` ORDER BY query_start DESC NULLS LAST LIMIT 50;`;

                const { data, error } = await admin.rpc('exec_sql', { sql });

                if (error) {
                    console.warn('[Connections] Error fetching connections:', error);
                    return [];
                }

                return (data || []).map((row: any) => ({
                    pid: row.pid,
                    user: row.user,
                    database: row.database,
                    state: row.state,
                    query: row.query,
                    duration: Math.round(row.duration || 0),
                    waitEvent: row.wait_event,
                }));
            },
            {
                ttl: 30000, // 30 sec - conexiones cambian rápido
                force: forceRefresh,
            }
        );

        // Calcular stats
        const stats = {
            total: connections.length,
            byState: connections.reduce((acc: any, conn: ActiveConnection) => {
                acc[conn.state] = (acc[conn.state] || 0) + 1;
                return acc;
            }, {}),
        };

        return NextResponse.json({
            success: true,
            data: connections,
            stats,
            cached,
        });
    } catch (error: any) {
        console.error('[Connections] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch connections',
            },
            { status: 500 }
        );
    }
}
