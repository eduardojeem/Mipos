import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Rutas estáticas principales
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/home`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/catalog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/offers`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.8,
        },
    ];

    // Obtener productos activos para el sitemap
    const { data: products } = await supabase
        .from('products')
        .select('id, updated_at, created_at')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

    const productRoutes: MetadataRoute.Sitemap =
        products?.map((product: any) => ({
            url: `${baseUrl}/catalog/${product.id}`,
            lastModified: new Date(product.updated_at || product.created_at),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })) || [];

    // Obtener categorías para el sitemap
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

    const categoryRoutes: MetadataRoute.Sitemap =
        categories?.map((category: any) => ({
            url: `${baseUrl}/catalog?category=${category.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        })) || [];

    return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
