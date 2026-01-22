import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ProductDetailClient from './ProductDetailClient';
import type { Product } from '@/types';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

// Generar metadatos dinámicos para SEO
export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!product) {
    return {
      title: 'Producto no encontrado',
      description: 'El producto que buscas no está disponible.',
    };
  }

  const productName = product.name || 'Producto';
  const description = product.description || `Compra ${productName} al mejor precio. Stock disponible.`;
  const price = product.sale_price || 0;

  return {
    title: `${productName} | Catálogo`,
    description: description.slice(0, 160), // Límite SEO
    keywords: [productName, product.brand, product.category_id, 'comprar', 'tienda'].filter(Boolean).join(', '),
    openGraph: {
      title: productName,
      description: description,
      type: 'website',
      images: product.image_url ? [{ url: product.image_url, alt: productName }] : [],
      siteName: 'Catálogo',
    },
    twitter: {
      card: 'summary_large_image',
      title: productName,
      description: description,
      images: product.image_url ? [product.image_url] : [],
    },
    other: {
      'product:price:amount': String(price),
      'product:price:currency': 'PYG',
      'product:availability': product.stock_quantity > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Consulta directa a Supabase
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Generar JSON-LD para Schema.org (rich snippets)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Compra ${product.name} en nuestra tienda`,
    image: product.image_url || undefined,
    sku: product.sku || product.id,
    brand: product.brand ? {
      '@type': 'Brand',
      name: product.brand,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.sale_price || 0,
      priceCurrency: 'PYG',
      availability: product.stock_quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    },
    aggregateRating: (product as any).rating ? {
      '@type': 'AggregateRating',
      ratingValue: (product as any).rating,
      ratingCount: (product as any).review_count || 1,
    } : undefined,
  };

  // Breadcrumbs Schema para navegación
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
        name: 'Catálogo',
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
      {/* Schema.org JSON-LD para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />

      <ProductDetailClient product={product as Product} />
    </>
  );
}