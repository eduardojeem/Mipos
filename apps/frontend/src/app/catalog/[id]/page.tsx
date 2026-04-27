import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import type { Product } from '@/types';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import {
  fetchPublicCatalogProductById,
} from '@/lib/public-site/catalog-data';
import { getProductPricing } from '@/lib/public-site/product-pricing';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto que buscas no esta disponible.',
    };
  }

  const product = await fetchPublicCatalogProductById(organization.id, id);
  if (!product) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto que buscas no esta disponible.',
    };
  }

  const productName = product.name || 'Producto';
  const description = product.description || `Compra ${productName} al mejor precio. Stock disponible.`;
  const pricing = getProductPricing(product);

  return {
    title: `${productName} | Catalogo`,
    description: description.slice(0, 160),
    keywords: [productName, product.brand, product.category_id, 'comprar', 'tienda'].filter(Boolean).join(', '),
    openGraph: {
      title: productName,
      description,
      type: 'website',
      images: product.image_url ? [{ url: product.image_url, alt: productName }] : [],
      siteName: 'Catalogo',
    },
    twitter: {
      card: 'summary_large_image',
      title: productName,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
    other: {
      'product:price:amount': String(pricing.displayPrice || 0),
      'product:price:currency': 'PYG',
      'product:availability': product.stock_quantity > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    notFound();
  }

  const config = await getPublicBusinessConfig(organization);
  if (!config.publicSite?.sections?.showCatalog) {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Detalle no disponible"
          description="El negocio oculto temporalmente el acceso publico a los productos del catalogo."
        />
      </StaticBusinessConfigProvider>
    );
  }

  const product = await fetchPublicCatalogProductById(organization.id, id);
  if (!product) {
    notFound();
  }

  const pricing = getProductPricing(product);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Compra ${product.name} en nuestra tienda`,
    image: product.image_url || undefined,
    sku: product.sku || product.id,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand,
        }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: pricing.displayPrice || 0,
      priceCurrency: 'PYG',
      availability: product.stock_quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/catalog/${product.id}`,
    },
    aggregateRating: (product as Product & { review_count?: number }).rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: (product as Product & { review_count?: number }).rating,
          ratingCount: (product as Product & { review_count?: number }).review_count || 1,
        }
      : undefined,
  };

  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/home`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Catalogo',
        item: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/catalog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/catalog/${product.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />

      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <ProductDetailClient product={product as Product} />
      </StaticBusinessConfigProvider>
    </>
  );
}
