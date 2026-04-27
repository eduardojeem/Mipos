import { 
  Promotion, 
  PromotionCreateInput, 
  PromotionUpdateInput, 
  ApplicableProduct,
  DiscountType 
} from '@/types/promotions'

const store: Promotion[] = [];
// Simple carousel config: ordered list of Promotion IDs featured in the carousel
let carouselIds: string[] = [];

function isValidDateString(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function validateInput(input: Partial<PromotionCreateInput>) {
  if (!input.name || input.name.trim().length < 2) {
    throw new Error('El nombre es requerido y debe tener al menos 2 caracteres');
  }
  if (!input.discountType || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(input.discountType)) {
    throw new Error('Tipo de descuento inválido');
  }
  if (typeof input.discountValue !== 'number' || input.discountValue < 0) {
    throw new Error('El valor del descuento debe ser un número mayor o igual a cero');
  }
  if (!input.startDate || !input.endDate || !isValidDateString(input.startDate) || !isValidDateString(input.endDate)) {
    throw new Error('Fechas inválidas');
  }
  if (new Date(input.endDate) < new Date(input.startDate)) {
    throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
  }
}

export function listPromotions(): Promotion[] {
  return store.slice().sort((a, b) => a.name.localeCompare(b.name));
}

export interface PromotionQuery {
  page?: number;
  limit?: number;
  search?: string; // by name or id
  status?: 'active' | 'inactive' | 'all' | 'scheduled' | 'expired';
  category?: string; // matches any applicableProducts.category
  dateFrom?: string; // ISO date string
  dateTo?: string;   // ISO date string
}

export interface PaginatedPromotions {
  items: Promotion[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function intersectsRange(promoStartISO: string, promoEndISO: string, fromISO?: string, toISO?: string): boolean {
  const promoStart = new Date(promoStartISO).getTime();
  const promoEnd = new Date(promoEndISO).getTime();
  const from = fromISO ? new Date(fromISO).getTime() : undefined;
  const to = toISO ? new Date(toISO).getTime() : undefined;

  if (from === undefined && to === undefined) return true;
  if (from !== undefined && to === undefined) return promoEnd >= from;
  if (from === undefined && to !== undefined) return promoStart <= to;
  return promoStart <= (to as number) && promoEnd >= (from as number);
}

export function queryPromotions(query: PromotionQuery = {}): PaginatedPromotions {
  const {
    page = 1,
    limit = 20,
    search = '',
    status = 'all',
    category = '',
    dateFrom,
    dateTo,
  } = query;

  const normalizedSearch = search.trim().toLowerCase();
  const normalizedCategory = category.trim().toLowerCase();

  let filtered = listPromotions();

  if (normalizedSearch) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(normalizedSearch) ||
      p.id.toLowerCase().includes(normalizedSearch)
    );
  }

  if (status !== 'all') {
    const now = Date.now();
    filtered = filtered.filter((promotion) => {
      const start = new Date(promotion.startDate).getTime();
      const end = new Date(promotion.endDate).getTime();

      if (status === 'inactive') return !promotion.isActive;
      if (status === 'scheduled') return promotion.isActive && start > now;
      if (status === 'expired') return promotion.isActive && end < now;
      return promotion.isActive && start <= now && end >= now;
    });
  }

  if (normalizedCategory) {
    filtered = filtered.filter(p =>
      p.applicableProducts?.some(ap => (ap.category || '').toLowerCase() === normalizedCategory)
    );
  }

  if (dateFrom || dateTo) {
    filtered = filtered.filter(p => intersectsRange(p.startDate, p.endDate, dateFrom, dateTo));
  }

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pages);
  const startIndex = (safePage - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  return { items, total, page: safePage, limit, pages };
}

export function createPromotion(input: PromotionCreateInput): Promotion {
  validateInput(input);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const applicableProducts: ApplicableProduct[] = (input.applicableProductIds || []).map(pid => ({ id: pid }));
  const promotion: Promotion = {
    ...input,
    id,
    name: input.name.trim(),
    description: input.description?.trim() || '',
    discountType: input.discountType as DiscountType,
    discountValue: input.discountValue,
    startDate: new Date(input.startDate).toISOString(),
    endDate: new Date(input.endDate).toISOString(),
    isActive: true,
    approvalStatus: 'pending',
    minPurchaseAmount: input.minPurchaseAmount || 0,
    maxDiscountAmount: input.maxDiscountAmount || 0,
    usageLimit: input.usageLimit || 0,
    usageCount: 0,
    applicableProducts,
    created_at: now,
  };
  store.push(promotion);
  return promotion;
}

export function updatePromotion(id: string, input: PromotionUpdateInput): Promotion {
  const idx = store.findIndex(p => p.id === id);
  if (idx === -1) {
    throw new Error('Promoción no encontrada');
  }
  
  const existing = store[idx];
  const applicableProducts: ApplicableProduct[] = input.applicableProductIds 
    ? input.applicableProductIds.map(pid => ({ id: pid }))
    : (existing.applicableProducts || []);

  const updated: Promotion = {
    ...existing,
    ...input,
    name: input.name?.trim() || existing.name,
    description: input.description?.trim() || existing.description,
    discountType: (input.discountType as DiscountType) || existing.discountType,
    discountValue: input.discountValue ?? existing.discountValue,
    startDate: input.startDate ? new Date(input.startDate).toISOString() : existing.startDate,
    endDate: input.endDate ? new Date(input.endDate).toISOString() : existing.endDate,
    minPurchaseAmount: input.minPurchaseAmount ?? existing.minPurchaseAmount,
    maxDiscountAmount: input.maxDiscountAmount ?? existing.maxDiscountAmount,
    usageLimit: input.usageLimit ?? existing.usageLimit,
    applicableProducts,
  };
  
  store[idx] = updated;
  return updated;
}

export function deletePromotion(id: string): boolean {
  const idx = store.findIndex(p => p.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}

export function togglePromotionStatus(id: string, isActive: boolean): Promotion {
  const idx = store.findIndex(p => p.id === id);
  if (idx === -1) {
    throw new Error('Promoción no encontrada');
  }
  store[idx].isActive = isActive;
  return store[idx];
}

// Carrusel helpers
export function getCarouselIds(): string[] {
  return [...carouselIds];
}

export function getCarouselPromotions(): Promotion[] {
  const map = new Map(store.map(p => [p.id, p] as const));
  return carouselIds
    .map(id => map.get(id))
    .filter((p): p is Promotion => !!p);
}

export function setCarousel(ids: string[]): { ids: string[]; items: Promotion[] } {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  const valid = unique.filter(id => store.some(p => p.id === id));
  carouselIds = valid;
  return { ids: getCarouselIds(), items: getCarouselPromotions() };
}

export function setPromotionApproval(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  comment?: string,
  actor?: { id?: string; email?: string }
): Promotion {
  const idx = store.findIndex(p => p.id === id);
  if (idx === -1) {
    throw new Error('Promoción no encontrada');
  }
  const now = new Date().toISOString();
  store[idx].approvalStatus = status;
  store[idx].approvalComment = comment || '';
  store[idx].approvedBy = status === 'approved' ? (actor?.email || actor?.id || 'unknown') : undefined;
  store[idx].approvedAt = status === 'approved' ? now : undefined;
  return store[idx];
}

export function __clearPromotionsForTests() {
  store.splice(0, store.length);
  carouselIds = [];
}
