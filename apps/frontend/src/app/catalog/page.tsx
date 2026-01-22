import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import CatalogClient from './CatalogClient';
import type { Product, Category } from '@/types';

interface CatalogPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    inStock?: string;
    onSale?: string;
    page?: string;
  }>;
}

// Generar metadatos dinámicos para SEO
export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const { search = '', category = '' } = await searchParams;
  const supabase = await createClient();

  // Obtener nombre del negocio
  const { data: config } = await supabase
    .from('business_config')
    .select('business_name')
    .single();

  const businessName = config?.business_name || 'Nuestra Tienda';

  // Obtener nombre de categoría si existe
  let categoryName = '';
  if (category && category !== 'all') {
    const { data: catData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', category)
      .single();
    categoryName = catData?.name || '';
  }

  // Construir título y descripción optimizados
  let title = `Catálogo de Productos - Compra Online | ${businessName}`;
  let description = `Explora nuestro catálogo completo de productos. Encuentra lo que necesitas con filtros avanzados, búsqueda inteligente y los mejores precios. Envío rápido garantizado.`;

  if (search) {
    title = `${search} - Resultados de Búsqueda | ${businessName}`;
    description = `Encuentra los mejores productos de "${search}" en ${businessName}. Compara precios, lee opiniones y compra con confianza. ¡Ofertas disponibles!`;
  } else if (categoryName) {
    title = `${categoryName} - Productos y Ofertas | ${businessName}`;
    description = `Descubre nuestra selección de ${categoryName}. Productos de calidad, precios competitivos y envío rápido. ¡Compra ahora en ${businessName}!`;
  }

  // Keywords optimizados
  const keywords = [
    'catálogo online',
    'productos',
    'comprar online',
    'tienda',
    'ofertas',
    'descuentos',
    businessName,
    search,
    categoryName,
  ]
    .filter(Boolean)
    .join(', ');

  // Construir URL canonical correctamente
  const buildCanonicalUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category && category !== 'all') params.set('category', category);
    const queryString = params.toString();
    return `/catalog${queryString ? `?${queryString}` : ''}`;
  };

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: buildCanonicalUrl(),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: businessName,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/catalog`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidar cada 60 segundos

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { search, category, sort, inStock, onSale, page: pageParam } = await searchParams;
  const supabase = await createClient();

  // Construir query base
  let productsQuery = supabase
    .from('products')
    .select('*')
    .eq('is_active', true);

  // Aplicar filtros de búsqueda si existen
  if (search) {
    productsQuery = productsQuery.ilike('name', `%${search}%`);
  }

  if (category && category !== 'all') {
    productsQuery = productsQuery.eq('category_id', category);
  }

  // Filtros consistentes con cliente
  const showOnlyInStock = inStock !== 'false';
  const showOnlyOnSale = onSale === 'true';
  if (showOnlyInStock) {
    productsQuery = productsQuery.gt('stock_quantity', 0);
  }
  if (showOnlyOnSale) {
    productsQuery = productsQuery.gt('discount_percentage', 0);
  }

  // Obtener productos (página solicitada)
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const start = (page - 1) * 36;
  const end = start + 35;
  // Orden consistente con cliente
  const sortMode = sort || 'popular';
  switch (sortMode) {
    case 'price-low':
      productsQuery = productsQuery.order('sale_price', { ascending: true });
      break;
    case 'price-high':
      productsQuery = productsQuery.order('sale_price', { ascending: false });
      break;
    case 'rating':
      productsQuery = productsQuery.order('rating', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      productsQuery = productsQuery.order('created_at', { ascending: false });
      break;
    case 'name':
      productsQuery = productsQuery.order('name', { ascending: true });
      break;
    default:
      productsQuery = productsQuery.order('stock_quantity', { ascending: false });
  }

  const { data: products, error: productsError } = await productsQuery.range(start, end);

  // Obtener categorías
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, description')
    .order('name');

  // Manejar errores (fallback a arrays vacíos)
  const initialProducts: Product[] = productsError ? [] : (products || []);
  const initialCategories = categoriesError ? [] : (categories || []) as Category[];

  // Log de errores en desarrollo
  if (process.env.NODE_ENV === 'development') {
    if (productsError) console.error('Error fetching products:', productsError);
    if (categoriesError) console.error('Error fetching categories:', categoriesError);
  }

  return (
    <CatalogClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
    />
  );
}
