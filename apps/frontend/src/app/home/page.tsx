import { Metadata } from 'next';
import { featuredProducts } from './data/homeData';
import HomeClient from './HomeClient';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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
    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Los Más Vendidos',
        itemListElement: featuredProducts.map((p, idx) => ({
            '@type': 'Product',
            position: idx + 1,
            name: p.name,
            image: p.image,
            offers: {
                '@type': 'Offer',
                priceCurrency: currency,
                price: p.price,
                availability: 'https://schema.org/InStock'
            }
        }))
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
