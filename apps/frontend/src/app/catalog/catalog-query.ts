export const CATALOG_DEFAULT_PAGE = 1;
export const CATALOG_DEFAULT_PAGE_SIZE = 36;
export const CATALOG_DEFAULT_MAX_PRICE = 1000;

export const CATALOG_SORT_OPTIONS = [
  'popular',
  'newest',
  'price-low',
  'price-high',
  'rating',
  'name',
] as const;

export type CatalogSortMode = (typeof CATALOG_SORT_OPTIONS)[number];

export type CatalogQueryValue = string | string[] | undefined;
export type CatalogQueryRecord = Record<string, CatalogQueryValue>;

export interface CatalogQueryState {
  search: string;
  categories: string[];
  sortBy: CatalogSortMode;
  inStock: boolean;
  onSale: boolean;
  page: number;
  itemsPerPage: number;
  minPrice: number;
  maxPrice: number | null;
  rating: number | null;
}

function isCatalogSortMode(value: string | null | undefined): value is CatalogSortMode {
  return CATALOG_SORT_OPTIONS.includes((value || '') as CatalogSortMode);
}

function normalizeString(value: string | null | undefined): string {
  return String(value || '').trim();
}

function parsePositiveInteger(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumber(value: string | null | undefined): number | null {
  const parsed = Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readValues(source: URLSearchParams | CatalogQueryRecord, key: string): string[] {
  if (source instanceof URLSearchParams) {
    return source.getAll(key).map((value) => normalizeString(value)).filter(Boolean);
  }

  const raw = source[key];
  if (Array.isArray(raw)) {
    return raw.map((value) => normalizeString(value)).filter(Boolean);
  }

  const normalized = normalizeString(raw);
  return normalized ? [normalized] : [];
}

function readFirstValue(source: URLSearchParams | CatalogQueryRecord, key: string): string | null {
  if (source instanceof URLSearchParams) {
    return source.get(key);
  }

  const raw = source[key];
  return Array.isArray(raw) ? raw[0] || null : raw || null;
}

function normalizeCategories(values: string[]): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];

  values
    .flatMap((value) => value.split(','))
    .map((value) => normalizeString(value))
    .filter(Boolean)
    .forEach((value) => {
      if (value === 'all' || seen.has(value)) {
        return;
      }

      seen.add(value);
      categories.push(value);
    });

  return categories;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

export function normalizeCatalogQuery(
  source: URLSearchParams | CatalogQueryRecord,
  options?: {
    defaultItemsPerPage?: number;
  }
): CatalogQueryState {
  const defaultItemsPerPage = options?.defaultItemsPerPage || CATALOG_DEFAULT_PAGE_SIZE;
  const search = normalizeString(readFirstValue(source, 'search'));
  const categories = normalizeCategories(readValues(source, 'category'));
  const sortRaw = normalizeString(readFirstValue(source, 'sort'));
  const inStockRaw = normalizeString(readFirstValue(source, 'inStock'));
  const onSaleRaw = normalizeString(readFirstValue(source, 'onSale'));
  const page = parsePositiveInteger(readFirstValue(source, 'page'), CATALOG_DEFAULT_PAGE);
  const itemsPerPage = parsePositiveInteger(readFirstValue(source, 'perPage'), defaultItemsPerPage);
  const minPrice = parseNonNegativeNumber(readFirstValue(source, 'minPrice')) ?? 0;
  const maxPrice = parseNonNegativeNumber(readFirstValue(source, 'maxPrice'));
  const ratingRaw = parsePositiveInteger(readFirstValue(source, 'rating'), 0);

  return {
    search,
    categories,
    sortBy: isCatalogSortMode(sortRaw) ? sortRaw : 'popular',
    inStock: inStockRaw !== 'false',
    onSale: onSaleRaw === 'true',
    page,
    itemsPerPage,
    minPrice,
    maxPrice,
    rating: ratingRaw > 0 ? Math.min(ratingRaw, 5) : null,
  };
}

export function buildCatalogSearchParams(
  state: CatalogQueryState,
  options?: {
    defaultItemsPerPage?: number;
    maxPriceCeiling?: number | null;
  }
): URLSearchParams {
  const params = new URLSearchParams();
  const defaultItemsPerPage = options?.defaultItemsPerPage || CATALOG_DEFAULT_PAGE_SIZE;
  const maxPriceCeiling = options?.maxPriceCeiling ?? null;

  if (state.search) {
    params.set('search', state.search);
  }

  state.categories.forEach((categoryId) => {
    if (categoryId) {
      params.append('category', categoryId);
    }
  });

  if (state.sortBy !== 'popular') {
    params.set('sort', state.sortBy);
  }

  if (!state.inStock) {
    params.set('inStock', 'false');
  }

  if (state.onSale) {
    params.set('onSale', 'true');
  }

  if (state.minPrice > 0) {
    params.set('minPrice', formatNumber(state.minPrice));
  }

  if (
    state.maxPrice !== null &&
    state.maxPrice > 0 &&
    (maxPriceCeiling === null || state.maxPrice < maxPriceCeiling)
  ) {
    params.set('maxPrice', formatNumber(state.maxPrice));
  }

  if (state.rating) {
    params.set('rating', String(state.rating));
  }

  if (state.page > CATALOG_DEFAULT_PAGE) {
    params.set('page', String(state.page));
  }

  if (state.itemsPerPage !== defaultItemsPerPage) {
    params.set('perPage', String(state.itemsPerPage));
  }

  return params;
}
