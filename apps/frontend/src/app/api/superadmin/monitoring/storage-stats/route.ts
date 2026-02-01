import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/app/api/_utils/auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { withCache } from '@/lib/api-cache';

interface StorageStats {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizePretty: string;
    byBucket: Array<{
        bucketName: string;
        fileCount: number;
        sizeBytes: number;
        sizePretty: string;
    }>;
    largestFiles?: Array<{
        name: string;
        bucketId: string;
        sizeBytes: number;
        sizePretty: string;
        createdAt: string;
    }>;
}

/**
 * GET /api/superadmin/monitoring/storage-stats
 * Obtiene estadísticas de Supabase Storage
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
        const includeDetails = searchParams.get('details') === 'true';

        const cacheKey = `storage-stats${includeDetails ? '-detailed' : ''}`;

        const { data: stats, cached } = await withCache(
            cacheKey,
            async () => {
                const admin = createAdminClient();

                // Query storage.objects para obtener estadísticas
                const { data: objects, error } = await admin
                    .from('objects')
                    .select('id, name, bucket_id, metadata, created_at')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('[Storage Stats] Error fetching objects:', error);
                    // Si falla, retornar datos vacíos
                    return {
                        totalFiles: 0,
                        totalSizeBytes: 0,
                        totalSizePretty: '0 bytes',
                        byBucket: [],
                    };
                }

                // Calcular totales y agrupar por bucket
                const bucketStats = new Map<string, { count: number; size: number }>();
                let totalSize = 0;
                let totalFiles = 0;

                const filesWithSize: Array<{
                    name: string;
                    bucketId: string;
                    sizeBytes: number;
                    createdAt: string;
                }> = [];

                objects?.forEach((obj: any) => {
                    totalFiles++;
                    const size = obj.metadata?.size || 0;
                    totalSize += size;

                    filesWithSize.push({
                        name: obj.name,
                        bucketId: obj.bucket_id,
                        sizeBytes: size,
                        createdAt: obj.created_at,
                    });

                    const current = bucketStats.get(obj.bucket_id) || { count: 0, size: 0 };
                    bucketStats.set(obj.bucket_id, {
                        count: current.count + 1,
                        size: current.size + size,
                    });
                });

                const formatBytes = (bytes: number): string => {
                    if (bytes === 0) return '0 bytes';
                    const k = 1024;
                    const sizes = ['bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                };

                const result: StorageStats = {
                    totalFiles,
                    totalSizeBytes: totalSize,
                    totalSizePretty: formatBytes(totalSize),
                    byBucket: Array.from(bucketStats.entries()).map(([bucketName, stats]) => ({
                        bucketName,
                        fileCount: stats.count,
                        sizeBytes: stats.size,
                        sizePretty: formatBytes(stats.size),
                    })),
                };

                // Si se solicitan detalles, incluir archivos más grandes
                if (includeDetails) {
                    const largestFiles = filesWithSize
                        .sort((a, b) => b.sizeBytes - a.sizeBytes)
                        .slice(0, 20)
                        .map(f => ({
                            ...f,
                            sizePretty: formatBytes(f.sizeBytes),
                        }));

                    result.largestFiles = largestFiles;
                }

                return result;
            },
            {
                ttl: 300000, // 5 min
                force: forceRefresh,
            }
        );

        return NextResponse.json(
            {
                success: true,
                data: stats,
                cached,
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=300',
                },
            }
        );
    } catch (error: any) {
        console.error('[Storage Stats] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Failed to fetch storage stats',
            },
            { status: 500 }
        );
    }
}
