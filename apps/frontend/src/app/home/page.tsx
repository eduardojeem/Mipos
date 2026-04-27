import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeClient from './HomeClient';
import PublicMarketplaceHome from './components/PublicMarketplaceHome';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { getGlobalMarketplaceHomeData, getPublicBusinessConfig } from '@/lib/public-site/data';
import { fetchTenantHomeSnapshot } from '@/lib/public-site/home-data';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

type SchemaSaleItemRow = {
  product_id?: string | null;
  quantity?: number | null;
  created_at?: string | null;
};

type SchemaProductRow = {
  id: string;
  name?: string | null;
  sale_price?: number | null;
  offer_price?: number | null;
  image_url?: string | null;
  images?: Array<{ url?: string | null }> | string[] | null;
};

function extractSchemaProductImage(product: SchemaProductRow): string {
  if (Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    if (typeof firstImage === 'string' && firstImage) {
      return firstImage;
    }

    if (firstImage && typeof firstImage === 'object' && typeof firstImage.url === 'string' && firstImage.url) {
      return firstImage.url;
    }
  }

  return product.image_url || '';
}

async function buildTenantSchemas(organizationId: string, businessName: string, config: Awaited<ReturnType<typeof getPublicBusinessConfig>>) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const adminClient = await createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  let itemListElements: Array<Record<string, unknown>> = [];

  try {
    const { data: items } = await adminClient
      .from('sale_items')
      .select('product_id, quantity, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', since.toISOString())
      .limit(500);

    const totals: Record<string, number> = {};
    (Array.isArray(items) ? (items as SchemaSaleItemRow[]) : []).forEach((item) => {
      const productId = String(item?.product_id || '');
      const quantity = Number(item?.quantity || 0);
      if (productId) {
        totals[productId] = (totals[productId] || 0) + quantity;
      }
    });

    const topIds = Object.entries(totals)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([productId]) => productId);

    if (topIds.length > 0) {
      const { data: products } = await adminClient
        .from('products')
        .select('id, name, sale_price, offer_price, image_url, images')
        .eq('organization_id', organizationId)
        .in('id', topIds);

      itemListElements = (Array.isArray(products) ? (products as SchemaProductRow[]) : []).map((product, index: number) => ({
        '@type': 'Product',
        position: index + 1,
        name: String(product?.name || 'Producto'),
        image: extractSchemaProductImage(product),
        offers: {
          '@type': 'Offer',
          priceCurrency: config.storeSettings.currency || 'PYG',
          price: Number(product?.offer_price ?? product?.sale_price ?? 0),
          availability: 'https://schema.org/InStock',
        },
      }));
    }
  } catch {}

  return {
    organizationSchema: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: businessName,
      url: baseUrl,
      logo: config.branding.logo || '',
      description: config.tagline || '',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: config.contact.phone || '',
        email: config.contact.email || '',
        contactType: 'customer service',
      },
    },
    websiteSchema: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: businessName,
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/catalog?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    webPageSchema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${businessName} - Inicio`,
      description:
        config.tagline ||
        'Bienvenido a nuestra tienda. Descubre nuestras ofertas y productos destacados.',
      url: `${baseUrl}/home`,
      inLanguage: 'es-PY',
    },
    itemListSchema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Los más vendidos',
      itemListElement: itemListElements,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const context = await resolveRequestTenantContext();

  if (context.kind === 'tenant') {
    const config = await getPublicBusinessConfig(context.organization);
    const businessName = config.businessName || context.organization.name || 'Nuestra Tienda';
    const description =
      config.tagline ||
      'Bienvenido a nuestra tienda. Descubre nuestras ofertas y productos destacados.';
    const image = config.branding.logo || '/og-image.png';

    return {
      title: `${businessName} - Inicio`,
      description,
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
            url: image,
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
        images: [image],
      },
    };
  }

  return {
    title: 'MiPOS Marketplace | Catálogo global y empresas activas',
    description:
      'Explora productos públicos, categorías globales y empresas activas desde el dominio principal de MiPOS.',
    alternates: {
      canonical: '/home',
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: 'MiPOS Marketplace',
      description:
        'Dominio principal público con catálogo global, categorías y empresas destacadas.',
      type: 'website',
      siteName: 'MiPOS Marketplace',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'MiPOS Marketplace',
      description:
        'Marketplace global para descubrir empresas activas y acceder a sus subdominios.',
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const context = await resolveRequestTenantContext();

  if (context.kind === 'tenant-not-found') {
    notFound();
  }

  if (context.kind === 'root') {
    const params = await searchParams;
    const query = String(params.q || '').trim();
    const marketplaceData = await getGlobalMarketplaceHomeData(context.hostname, query);

    return <PublicMarketplaceHome data={marketplaceData} searchQuery={query} />;
  }

  const config = await getPublicBusinessConfig(context.organization);
  const homeSnapshot = await fetchTenantHomeSnapshot(context.organization.id);
  const businessName = config.businessName || context.organization.name || 'Nuestra Tienda';
  const schemas = await buildTenantSchemas(context.organization.id, businessName, config);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.itemListSchema) }}
      />

      <StaticBusinessConfigProvider
        config={config}
        organizationId={context.organization.id}
        organizationName={context.organization.name}
      >
        <HomeClient initialData={homeSnapshot} />
      </StaticBusinessConfigProvider>
    </>
  );
}
