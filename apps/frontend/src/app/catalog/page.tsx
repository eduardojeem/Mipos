import { createClient } from "@/lib/supabase/server";
import CatalogClient from "./CatalogClient";
import type { Product, Category } from "@/types";
import { Metadata } from "next";
import { getCurrentOrganization } from "@/lib/organization/get-current-organization";

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

// ✅ Metadata simplificado - solo lo esencial para SEO
export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const { search = '', category = '' } = await searchParams;
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  // ✅ Obtener config de la organización específica
  const { data: configData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'business_config')
    .eq('organization_id', organization.id)
    .single();

  const config = configData?.value;
  const businessName = config?.business_name || organization.name || 'Nuestra Tienda';

  // Título dinámico simple
  const title = search
    ? `${search} - Búsqueda | ${businessName}`
    : category && category !== 'all'
      ? `Productos - Categoría | ${businessName}`
      : `Catálogo de Productos | ${businessName}`;

  const description = `Explora nuestro catálogo de productos. ${search ? `Resultados para "${search}".` : ''} Compra online con envío rápido.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  // ✅ Construir query de productos con filtro de organización
  let query = supabase
    .from('products')
    .select('id, name, sku, sale_price, offer_price, stock_quantity, image_url, images, category_id, is_active')
    .eq('organization_id', organization.id)
    .eq('is_active', true);

  // Aplicar filtros
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
  }

  if (params.category && params.category !== 'all') {
    query = query.eq('category_id', params.category);
  }

  if (params.inStock !== 'false') {
    query = query.gt('stock_quantity', 0);
  }

  if (params.onSale === 'true') {
    query = query.not('offer_price', 'is', null);
  }

  // Ordenamiento
  const sortOption = params.sort || 'popular';
  if (sortOption === 'price-asc') query = query.order('sale_price', { ascending: true });
  else if (sortOption === 'price-desc') query = query.order('sale_price', { ascending: false });
  else if (sortOption === 'name') query = query.order('name', { ascending: true });
  else query = query.order('created_at', { ascending: false }); // Por defecto: más recientes

  // Límite para mejor performance
  query = query.limit(100);

  const { data: products } = await query;

  // ✅ Obtener categorías de la organización
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('organization_id', organization.id)
    .order('name');

  return (
    <CatalogClient
      initialProducts={(products || []) as Product[]}
      initialCategories={(categories || []) as Category[]}
    />
  );
}
