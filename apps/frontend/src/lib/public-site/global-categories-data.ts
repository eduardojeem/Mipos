import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// ARQUITECTURA DE CATEGORÍAS (enterprise, post-migración 20260517)
//
// marketplace_categories → curadas por admin SaaS, públicas, SEO-friendly
// categories             → privadas de cada organización (catálogo interno)
//
// Este módulo lee SOLO marketplace_categories vía la RPC
// `get_marketplace_categories_with_counts`. Nunca mezcla categorías privadas
// de organizaciones con el directorio público del marketplace.
// ---------------------------------------------------------------------------

export type GlobalCategoriesSortMode = 'products' | 'companies' | 'name';

export interface GlobalCategoriesQueryState {
  search: string;
  sortBy: GlobalCategoriesSortMode;
}

export interface GlobalCategoryExplorerItem {
  id: string;
  key: string;       // slug de marketplace_categories (URL-safe)
  name: string;
  slug: string;
  icon: string | null;
  color: string;
  image_url: string | null;
  is_featured: boolean;
  productCount: number;
  organizationCount: number;
  shareOfProducts: number;
  href: string;
}

export interface GlobalCategoriesSnapshot {
  categories: GlobalCategoryExplorerItem[];
  totalCategories: number;
  visibleCategories: number;
  totalOrganizations: number;
  matchingOrganizations: number;
  totalProducts: number;
  categorizedProducts: number;
  uncategorizedProducts: number;
}

type MarketplaceCategoryRPCRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string;
  image_url: string | null;
  is_featured: boolean;
  sort_order: number;
  org_count: number | string;
  product_count: number | string;
};

function sanitizeSearch(search: string): string {
  return search.replace(/[,%]/g, ' ').trim().toLowerCase();
}

function sortCategories(
  items: GlobalCategoryExplorerItem[],
  sortBy: GlobalCategoriesSortMode
): GlobalCategoryExplorerItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'companies':
      sorted.sort((a, b) => {
        const diff = b.organizationCount - a.organizationCount;
        if (diff !== 0) return diff;
        return b.productCount - a.productCount || a.name.localeCompare(b.name, 'es');
      });
      break;
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      break;
    case 'products':
    default:
      sorted.sort((a, b) => {
        const diff = b.productCount - a.productCount;
        if (diff !== 0) return diff;
        return b.organizationCount - a.organizationCount || a.name.localeCompare(b.name, 'es');
      });
      break;
  }
  return sorted;
}

/**
 * Retorna el snapshot de categorías del marketplace para la página /home/categorias.
 *
 * Fuente de verdad: marketplace_categories (admin-curated).
 * Las categorías privadas de organizaciones NO aparecen aquí.
 */
export async function fetchGlobalCategoriesSnapshot(
  input: GlobalCategoriesQueryState
): Promise<GlobalCategoriesSnapshot> {
  const client = await createAdminClient();

  const { data, error } = await (client as any).rpc('get_marketplace_categories_with_counts');

  if (error) {
    console.error('[global-categories-data] RPC error:', error);
    return emptySnapshot();
  }

  const rows = (data || []) as MarketplaceCategoryRPCRow[];

  if (rows.length === 0) {
    return emptySnapshot();
  }

  const normalizedSearch = sanitizeSearch(input.search);

  const allItems: GlobalCategoryExplorerItem[] = rows.map((row) => {
    const orgCount     = Number(row.org_count)     || 0;
    const productCount = Number(row.product_count) || 0;
    return {
      id:                row.id,
      key:               row.slug,
      name:              row.name,
      slug:              row.slug,
      icon:              row.icon,
      color:             row.color,
      image_url:         row.image_url,
      is_featured:       row.is_featured,
      productCount,
      organizationCount: orgCount,
      shareOfProducts:   0, // calculado abajo
      href:              `/home/catalogo?category=${encodeURIComponent(row.slug)}`,
    };
  });

  const totalProducts = allItems.reduce((sum, c) => sum + c.productCount, 0);

  // Calcular shareOfProducts
  for (const item of allItems) {
    item.shareOfProducts = totalProducts > 0 ? item.productCount / totalProducts : 0;
  }

  const visibleItems = normalizedSearch
    ? allItems.filter((c) => c.name.toLowerCase().includes(normalizedSearch))
    : allItems;

  const sortedItems = sortCategories(visibleItems, input.sortBy);

  const totalOrganizations = allItems.reduce((sum, c) => sum + c.organizationCount, 0);
  const matchingOrganizations = visibleItems.reduce((sum, c) => sum + c.organizationCount, 0);
  const categorizedProducts = allItems.reduce((sum, c) => sum + c.productCount, 0);

  return {
    categories:             sortedItems,
    totalCategories:        allItems.length,
    visibleCategories:      sortedItems.length,
    totalOrganizations,
    matchingOrganizations,
    totalProducts:          categorizedProducts,
    categorizedProducts,
    uncategorizedProducts:  0, // no aplica en el nuevo sistema; orgs sin categoría simplemente no aparecen
  };
}

function emptySnapshot(): GlobalCategoriesSnapshot {
  return {
    categories:            [],
    totalCategories:       0,
    visibleCategories:     0,
    totalOrganizations:    0,
    matchingOrganizations: 0,
    totalProducts:         0,
    categorizedProducts:   0,
    uncategorizedProducts: 0,
  };
}
