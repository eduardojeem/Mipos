import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    let config: any = null;
    try {
        const supabase = await createClient();
        if (supabase && typeof supabase.from === 'function') {
            const { data } = await supabase
                .from('business_config')
                .select('*')
                .single();
            config = data;
        }
    } catch (e) {
        // Fallback to defaults
    }

    const businessName = config?.business_name || 'Nuestra Tienda';
    const description = config?.tagline || 'Bienvenido a nuestra tienda. Descubre nuestras ofertas y productos destacados.';
    const ogImage = (config?.branding?.logo as string | undefined) || '/og-image.png';
    const twitterImage = (config?.branding?.logo as string | undefined) || '/twitter-image.png';

    return {
        title: `${businessName} - Inicio`,
        description,
        keywords: ['tienda online', 'productos', 'ofertas', 'comprar', businessName],
        alternates: {
            canonical: '/home',
        },
        robots: {
            index: true,
            follow: true,
        },
        openGraph: {
            title: businessName,
            description,
            type: 'website',
            siteName: businessName,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: `${businessName} - Inicio`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: businessName,
            description,
            images: [twitterImage],
        },
    };
}

export default async function HomePage() {
    let config: any = null;

    try {
        const supabase = await createClient();
        if (supabase && typeof supabase.from === 'function') {
            const { data } = await supabase
                .from('business_config')
                .select('*')
                .single();
            config = data;
        } else {
            console.warn('⚠️ Supabase client is invalid or mock mode is incomplete.');
        }
    } catch (error) {
        console.error('Error fetching business config:', error);
    }

    // Schema.org - Organization
    const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: config?.business_name || 'Nuestra Tienda',
        url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
        logo: config?.logo_url || '',
        description: config?.tagline || '',
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: config?.phone || '',
            email: config?.email || '',
            contactType: 'customer service',
        },
        address: config?.address ? {
            '@type': 'PostalAddress',
            streetAddress: config.address,
        } : undefined,
    };

    // Schema.org - WebSite (para habilitar Sitelinks Search Box en Google)
    const websiteSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: config?.business_name || 'Nuestra Tienda',
        url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/catalog?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    // Schema.org - WebPage (Home)
    const webPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `${config?.business_name || 'Nuestra Tienda'} - Inicio`,
        description: config?.tagline || 'Bienvenido a nuestra tienda. Descubre nuestras ofertas y productos destacados.',
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/home`,
        inLanguage: 'es-PY',
        isPartOf: {
            '@type': 'WebSite',
            name: config?.business_name || 'Nuestra Tienda',
            url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
        },
    };

    // Schema.org - ItemList de Productos Destacados (fallback SEO)
    const currency = (config as any)?.storeSettings?.currency || 'PYG';
    let itemListElements: any[] = [];
    try {
        const supabase = await createClient();
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: items } = await supabase
            .from('sale_items')
            .select('product_id, quantity, created_at')
            .gte('created_at', since.toISOString())
            .limit(500);
        const totals: Record<string, number> = {};
        (Array.isArray(items) ? items : []).forEach((it: any) => {
            const pid = String(it?.product_id || '');
            const qty = Number(it?.quantity || 0);
            if (pid) totals[pid] = (totals[pid] || 0) + qty;
        });
        const topIds = Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([pid]) => pid);
        if (topIds.length > 0) {
            const { data: prods } = await supabase
                .from('products')
                .select('id, name, sale_price, offer_price, image_url, images')
                .in('id', topIds);
            const list = (Array.isArray(prods) ? prods : []);
            itemListElements = list.map((p: any, idx: number) => ({
                '@type': 'Product',
                position: idx + 1,
                name: String(p?.name || 'Producto'),
                image: (Array.isArray(p?.images) && p.images[0]?.url) ? p.images[0].url : (p?.image_url || ''),
                offers: {
                    '@type': 'Offer',
                    priceCurrency: currency,
                    price: Number(p?.offer_price ?? p?.sale_price ?? 0),
                    availability: 'https://schema.org/InStock'
                }
            }));
        }
    } catch {}
    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Los Más Vendidos',
        itemListElement: itemListElements
    };

    return (
        <>
            {/* Schema.org JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(organizationSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(websiteSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(webPageSchema),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(itemListSchema),
                }}
            />

            <HomeClient />
        </>
    );
}
