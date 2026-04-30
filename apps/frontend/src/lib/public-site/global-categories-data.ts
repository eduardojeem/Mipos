import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';

const PUBLIC_ORGANIZATION_STATUSES = ['ACTIVE', 'TRIAL'];
const ORGANIZATION_BATCH_SIZE = 250;
const PRODUCT_BATCH_SIZE = 500;
const PRODUCT_BASE_COLUMNS = ['id', 'organization_id', 'category_id'];
const PRODUCT_OPTIONAL_COLUMNS = ['is_active'];

type OrganizationRow = {
  id: string;
};

type ProductCategoryRow = {
  id: string;
  organization_id?: string | null;
  category_id?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
};

type CategoryAccumulator = {
  id: string;
  key: string;
  name: string;
  productIds: Set<string>;
  organizationIds: Set<string>;
};

export type GlobalCategoriesSortMode = 'products' | 'companies' | 'name';

export interface GlobalCategoriesQueryState {
  search: string;
  sortBy: GlobalCategoriesSortMode;
}

export interface GlobalCategoryExplorerItem {
  id: string;
  key: string;
  name: string;
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

function isMissingColumnError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

function getMissingColumnName(error: unknown): string | null {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '');

  if (code !== '42703' && !isMissingColumnError(error)) {
    return null;
  }

  const qualifiedMatch = message.match(/column\s+[a-z0-9_]+\.(\w+)\s+does not exist/i);
  if (qualifiedMatch?.[1]) {
    return qualifiedMatch[1].toLowerCase();
  }

  const unqualifiedMatch = message.match(/column\s+(\w+)\s+does not exist/i);
  return unqualifiedMatch?.[1]?.toLowerCase() || null;
}

function buildSelectClause(baseColumns: string[], optionalColumns: string[], missingColumns: Set<string>) {
  return [...baseColumns, ...optionalColumns.filter((column) => !missingColumns.has(column))].join(',');
}

function sanitizeSearchTerm(search: string): string {
  return search.replace(/[,%]/g, ' ').trim();
}

function normalizeDisplayText(value: string | null | undefined, fallback = ''): string {
  const next = String(value || fallback).trim();
  if (!next) {
    return fallback;
  }

  try {
    const decoded = new TextDecoder('utf-8').decode(
      Uint8Array.from(next, (char) => char.charCodeAt(0))
    );
    return Array.from(decoded).some((char) => char.charCodeAt(0) === 65533) ? next : decoded;
  } catch {
    return next;
  }
}

function toCategoryKey(value: string): string {
  const normalized = normalizeDisplayText(value, 'sin-categoria')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'sin-categoria';
}

function sortCategories(items: CategoryAccumulator[], sortBy: GlobalCategoriesSortMode): CategoryAccumulator[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'companies':
      sorted.sort((left, right) => {
        const companyDiff = right.organizationIds.size - left.organizationIds.size;
        if (companyDiff !== 0) return companyDiff;
        const productDiff = right.productIds.size - left.productIds.size;
        if (productDiff !== 0) return productDiff;
        return left.name.localeCompare(right.name, 'es');
      });
      break;
    case 'name':
      sorted.sort((left, right) => left.name.localeCompare(right.name, 'es'));
      break;
    case 'products':
    default:
      sorted.sort((left, right) => {
        const productDiff = right.productIds.size - left.productIds.size;
        if (productDiff !== 0) return productDiff;
        const companyDiff = right.organizationIds.size - left.organizationIds.size;
        if (companyDiff !== 0) return companyDiff;
        return left.name.localeCompare(right.name, 'es');
      });
      break;
  }

  return sorted;
}

async function fetchActiveOrganizationIds(): Promise<{ organizationIds: string[]; totalOrganizations: number }> {
  const client = await createAdminClient();
  const organizationIds: string[] = [];
  let totalOrganizations = 0;

  for (let from = 0; ; from += ORGANIZATION_BATCH_SIZE) {
    const result = await client
      .from('organizations')
      .select('id', { count: 'exact' })
      .in('subscription_status', PUBLIC_ORGANIZATION_STATUSES)
      .order('created_at', { ascending: false })
      .range(from, from + ORGANIZATION_BATCH_SIZE - 1);

    if (result.error) {
      throw result.error;
    }

    if (typeof result.count === 'number') {
      totalOrganizations = result.count;
    }

    const rows = (result.data || []) as OrganizationRow[];
    organizationIds.push(...rows.map((row) => row.id));

    if (rows.length < ORGANIZATION_BATCH_SIZE) {
      break;
    }
  }

  return { organizationIds, totalOrganizations };
}

async function fetchCategoryProducts(organizationIds: string[]): Promise<ProductCategoryRow[]> {
  if (organizationIds.length === 0) {
    return [];
  }

  const client = await createAdminClient();
  const products: ProductCategoryRow[] = [];
  const missingColumns = new Set<string>();

  const runQuery = async (
    selectClause: string,
    from: number,
    to: number,
    unavailableColumns: Set<string>
  ) => {
    let query = client
      .from('products')
      .select(selectClause)
      .in('organization_id', organizationIds);

    if (!unavailableColumns.has('is_active')) {
      query = query.eq('is_active', true);
    }

    return query.range(from, to);
  };

  for (;;) {
    const selectClause = buildSelectClause(PRODUCT_BASE_COLUMNS, PRODUCT_OPTIONAL_COLUMNS, missingColumns);
    let recovered = false;

    products.length = 0;

    for (let from = 0; ; from += PRODUCT_BATCH_SIZE) {
      const result = await runQuery(selectClause, from, from + PRODUCT_BATCH_SIZE - 1, missingColumns);
      const missingColumn = getMissingColumnName(result.error);

      if (
        missingColumn &&
        PRODUCT_OPTIONAL_COLUMNS.includes(missingColumn) &&
        !missingColumns.has(missingColumn)
      ) {
        missingColumns.add(missingColumn);
        recovered = true;
        break;
      }

      if (result.error) {
        throw result.error;
      }

      const rows = (result.data || []) as ProductCategoryRow[];
      products.push(...rows);

      if (rows.length < PRODUCT_BATCH_SIZE) {
        break;
      }
    }

    if (!recovered) {
      break;
    }
  }

  return products;
}

async function fetchCategoryMap(categoryIds: string[]): Promise<Map<string, string>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const client = await createAdminClient();
  const categoryMap = new Map<string, string>();

  for (let from = 0; from < categoryIds.length; from += PRODUCT_BATCH_SIZE) {
    const batch = categoryIds.slice(from, from + PRODUCT_BATCH_SIZE);
    const { data, error } = await client
      .from('categories')
      .select('id,name')
      .in('id', batch);

    if (error) {
      throw error;
    }

    ((data || []) as CategoryRow[]).forEach((category) => {
      categoryMap.set(category.id, normalizeDisplayText(category.name, 'Sin categoria'));
    });
  }

  return categoryMap;
}

function buildCategoryEntries(
  products: ProductCategoryRow[],
  categoryMap: Map<string, string>
): CategoryAccumulator[] {
  const accumulator = new Map<string, CategoryAccumulator>();

  products.forEach((product) => {
    const categoryName = product.category_id
      ? categoryMap.get(product.category_id) || 'Sin categoria'
      : 'Sin categoria';
    const key = toCategoryKey(categoryName);
    const current = accumulator.get(key) || {
      id: product.category_id || key,
      key,
      name: categoryName,
      productIds: new Set<string>(),
      organizationIds: new Set<string>(),
    };

    current.productIds.add(product.id);
    if (product.organization_id) {
      current.organizationIds.add(product.organization_id);
    }

    accumulator.set(key, current);
  });

  return Array.from(accumulator.values());
}

export async function fetchGlobalCategoriesSnapshot(
  input: GlobalCategoriesQueryState
): Promise<GlobalCategoriesSnapshot> {
  const { organizationIds, totalOrganizations } = await fetchActiveOrganizationIds();
  if (organizationIds.length === 0) {
    return {
      categories: [],
      totalCategories: 0,
      visibleCategories: 0,
      totalOrganizations: 0,
      matchingOrganizations: 0,
      totalProducts: 0,
      categorizedProducts: 0,
      uncategorizedProducts: 0,
    };
  }

  const products = await fetchCategoryProducts(organizationIds);
  const categoryIds = Array.from(
    new Set(
      products
        .map((product) => product.category_id)
        .filter((categoryId): categoryId is string => typeof categoryId === 'string' && categoryId.length > 0)
    )
  );
  const categoryMap = await fetchCategoryMap(categoryIds);
  const allCategories = buildCategoryEntries(products, categoryMap);
  const normalizedSearch = sanitizeSearchTerm(input.search).toLowerCase();
  const visibleCategories = normalizedSearch
    ? allCategories.filter((category) => category.name.toLowerCase().includes(normalizedSearch))
    : allCategories;
  const sortedCategories = sortCategories(visibleCategories, input.sortBy);
  const categorizedProducts = products.filter((product) => product.category_id).length;
  const matchingOrganizations = new Set(
    sortedCategories.flatMap((category) => Array.from(category.organizationIds))
  ).size;
  const totalProducts = products.length;

  return {
    categories: sortedCategories.map((category) => ({
      id: category.id,
      key: category.key,
      name: category.name,
      productCount: category.productIds.size,
      organizationCount: category.organizationIds.size,
      shareOfProducts: totalProducts > 0 ? category.productIds.size / totalProducts : 0,
      href: `/home/catalogo?category=${encodeURIComponent(category.key)}`,
    })),
    totalCategories: allCategories.length,
    visibleCategories: sortedCategories.length,
    totalOrganizations,
    matchingOrganizations,
    totalProducts,
    categorizedProducts,
    uncategorizedProducts: Math.max(totalProducts - categorizedProducts, 0),
  };
}
