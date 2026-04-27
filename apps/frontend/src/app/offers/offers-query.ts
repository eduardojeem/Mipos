import type { OfferPagination } from './offers-types';

export const OFFER_DEFAULT_PAGE_SIZE = 24;

export type OfferSortMode =
  | 'best_savings'
  | 'highest_discount'
  | 'price_low_high'
  | 'price_high_low'
  | 'ending_soon';

export type OfferStatusFilter = 'active' | 'upcoming' | 'ended';

export type OfferQueryRecord = Record<string, string | string[] | undefined>;

export interface OfferQueryState {
  search: string;
  category: string | null;
  promotion: string | null;
  sort: OfferSortMode;
  status: OfferStatusFilter;
  page: number;
  limit: number;
}

function pickFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePositiveInt(value: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function normalizeOfferSort(value: string | undefined): OfferSortMode {
  switch (value) {
    case 'highest_discount':
    case 'price_low_high':
    case 'price_high_low':
    case 'ending_soon':
      return value;
    case 'best_savings':
    default:
      return 'best_savings';
  }
}

export function normalizeOfferStatus(value: string | undefined): OfferStatusFilter {
  switch (value) {
    case 'upcoming':
    case 'ended':
      return value;
    case 'active':
    default:
      return 'active';
  }
}

export function normalizeOfferQuery(query: OfferQueryRecord): OfferQueryState {
  const search = (pickFirst(query.search) || '').trim();
  const categoryValue = (pickFirst(query.category) || '').trim();
  const promotionValue = (pickFirst(query.promotion) || '').trim();

  return {
    search,
    category: categoryValue && categoryValue !== 'all' ? categoryValue : null,
    promotion: promotionValue || null,
    sort: normalizeOfferSort(pickFirst(query.sort)),
    status: normalizeOfferStatus(pickFirst(query.status)),
    page: normalizePositiveInt(pickFirst(query.page), 1, 999),
    limit: normalizePositiveInt(pickFirst(query.limit), OFFER_DEFAULT_PAGE_SIZE, 100),
  };
}

export function buildOfferSearchParams(
  state: OfferQueryState,
  options?: { defaultLimit?: number }
) {
  const params = new URLSearchParams();
  const defaultLimit = options?.defaultLimit ?? OFFER_DEFAULT_PAGE_SIZE;

  if (state.search) {
    params.set('search', state.search);
  }

  if (state.category) {
    params.set('category', state.category);
  }

  if (state.promotion) {
    params.set('promotion', state.promotion);
  }

  if (state.sort !== 'best_savings') {
    params.set('sort', state.sort);
  }

  if (state.status !== 'active') {
    params.set('status', state.status);
  }

  if (state.page > 1) {
    params.set('page', String(state.page));
  }

  if (state.limit !== defaultLimit) {
    params.set('limit', String(state.limit));
  }

  return params;
}

export function clampOfferPage(state: OfferQueryState, pagination: OfferPagination): OfferQueryState {
  const totalPages = Math.max(1, pagination.totalPages || 1);
  if (state.page <= totalPages) {
    return state;
  }

  return {
    ...state,
    page: totalPages,
  };
}
