import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CartItem } from '@/hooks/useCart'
import type { Customer } from '@/types'

// Root state types
export type AppState = {
  isMobile: boolean
  setIsMobile: (v: boolean) => void
}

export type CacheEntry<T = any> = {
  key: string
  data: T
  timestamp: number
  ttl: number
}

export type CacheState = {
  entries: Record<string, CacheEntry>
  setCache: <T>(key: string, data: T, ttl: number) => void
  getCache: <T>(key: string) => T | undefined
  invalidate: (key: string) => void
  clear: () => void
}

export type Product = {
  id: string
  name: string
  price: number
  category: string
}

export type Promotion = {
  id: string
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  minPurchaseAmount?: number
  maxDiscountAmount?: number
  usageLimit?: number
  usageCount: number
  applicableProducts: Product[]
  createdAt: string
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  approvalComment?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
}

export type PromotionsState = {
  items: Promotion[]
  loading: boolean
  error?: string
  promotionsSource?: string
  fetchPromotions: (params?: { search?: string; status?: 'all' | 'active' | 'inactive' }) => Promise<void>
  setItems: (items: Promotion[]) => void
}

export type CouponState = {
  couponCode: string | null
  couponDiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null
  setCoupon: (code: string | null, discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null) => void
  clearCoupon: () => void
}

export type UIState = {
  isGlobalLoading: boolean
  loadingMessage?: string
  loadingProgress?: number
  startLoading: (message?: string) => void
  stopLoading: () => void
}

export type EditingFormData = {
  name: string
  code: string
  description?: string
  categoryId: string
  price: number
  costPrice: number
  wholesalePrice: number
  offerPrice?: number
  offerActive?: boolean
  stock: number
  minStock: number
  images?: string[]
  ivaIncluded?: boolean
  ivaRate?: number
  brand?: string
  shade?: string
  skin_type?: string
  ingredients?: string
  volume?: string
  spf?: number
  finish?: string
  coverage?: string
  waterproof?: boolean
  vegan?: boolean
  cruelty_free?: boolean
  expiration_date?: string
}

export type ProductEditingState = {
  currentProductId: string | null
  formData: EditingFormData | null
  isEditing: boolean
  isLoading: boolean
  editingError?: string
  setCurrentProductId: (id: string | null) => void
  setFormData: (data: EditingFormData | null) => void
  patchFormData: (partial: Partial<EditingFormData>) => void
  setIsEditing: (v: boolean) => void
  setIsLoading: (v: boolean) => void
  setEditingError: (msg?: string) => void
  resetEditing: () => void
}

export type POSState = {
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'
  setPaymentMethod: (m: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER') => void
  discount: number
  setDiscount: (v: number) => void
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  setDiscountType: (t: 'PERCENTAGE' | 'FIXED_AMOUNT') => void
  notes: string
  setNotes: (v: string) => void
  couponDiscountAmount?: number
  setCouponCode: (code: string) => void
  setCouponData: (code: string, discountAmount: number, discountType: 'PERCENTAGE' | 'FIXED_AMOUNT') => void
  heldSales: HeldSale[]
  addHeldSale: (sale: HeldSale) => void
  removeHeldSale: (id: string) => void
}

export type HeldSale = {
  id: string
  timestamp: number
  cart: CartItem[]
  customer?: Customer | null
  discount: number
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  notes?: string
}

export type RootState = AppState & CacheState & PromotionsState & CouponState & UIState & ProductEditingState & POSState

// Lightweight logger middleware wrapping the config. Works without external deps.
function withLogger<T extends RootState>(
  initializer: (set: any, get: any) => T,
  name = 'RootStore'
) {
  return (set: any, get: any) => {
    const wrappedSet = (fn: any, replace?: boolean, action?: string) => {
      const before = get()
      try {
        set(fn, replace)
        const after = get()
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[store:${name}]`, action || 'set', { before, after })
        }
      } catch (e) {
        console.error(`[store:${name}] error in action`, action, e)
        throw e
      }
    }
    return initializer(wrappedSet, get)
  }
}

export const useStore = create<RootState>()(
  devtools(
    withLogger<RootState>((set, get) => ({
      // App slice
      isMobile: false,
      setIsMobile: (v: boolean) => set((s: RootState) => ({ ...s, isMobile: v }), false, 'app/setIsMobile'),

      // Cache slice
      entries: {},
      setCache: (key, data, ttl) => set((s: RootState) => ({
        ...s,
        entries: {
          ...s.entries,
          [key]: { key, data, ttl, timestamp: Date.now() }
        }
      }), false, `cache/set/${key}`),
      getCache: (key) => {
        const entry = get().entries[key]
        if (!entry) return undefined
        const isExpired = Date.now() - entry.timestamp > entry.ttl
        return isExpired ? undefined : (entry.data as any)
      },
      invalidate: (key) => set((s: RootState) => {
        const { [key]: _, ...rest } = s.entries
        return { ...s, entries: rest }
      }, false, `cache/invalidate/${key}`),
      clear: () => set((s: RootState) => ({ ...s, entries: {} }), false, 'cache/clear'),

      // Promotions slice
      items: [],
      loading: false,
      error: undefined,
      promotionsSource: undefined,
      setItems: (items) => set((s: RootState) => ({ ...s, items }), false, 'promotions/setItems'),
      fetchPromotions: async (params) => {
        const key = `promotions:list:${JSON.stringify(params || {})}`
        const cached = get().getCache(key)
        if (cached) {
          set((s: RootState) => ({ ...s, items: cached, loading: false, error: undefined }), false, 'promotions/fetch/fromCache')
          return
        }
        set((s: RootState) => ({ ...s, loading: true, error: undefined }), false, 'promotions/fetch/start')
        try {
          const apiMod = await import('@/lib/api')
          const api = (apiMod as any).default || (apiMod as any).api
          const response = await api.get('/promotions', { params })
          const data = response?.data
          const raw = (
            Array.isArray(data?.data) ? data.data :
              (data?.success && Array.isArray(data?.data)) ? data.data :
                Array.isArray(data?.items) ? data.items :
                  Array.isArray(data) ? data :
                    []
          ) as any[]
          const list = raw.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? '',
            discountType: r.discountType ?? r.type,
            discountValue: r.discountValue ?? r.value,
            startDate: r.startDate ?? r.start_date,
            endDate: r.endDate ?? r.end_date,
            isActive: typeof r.isActive !== 'undefined' ? r.isActive : r.is_active,
            minPurchaseAmount: r.minPurchaseAmount ?? r.minPurchase ?? 0,
            maxDiscountAmount: r.maxDiscountAmount ?? r.maxDiscount ?? 0,
            usageLimit: r.usageLimit ?? 0,
            usageCount: r.usageCount ?? 0,
            applicableProducts: Array.isArray(r.applicableProducts) ? r.applicableProducts : [] as any[],
            createdAt: r.createdAt ?? new Date().toISOString()
          })) as Promotion[]
          const sourceHeader = String((response?.headers || {})['x-source'] || '')
          const origin = sourceHeader || (Array.isArray(data?.data) ? 'supabase' : (data?.success ? 'supabase' : 'memory'))
          set((s: RootState) => ({ ...s, items: list, loading: false, promotionsSource: origin }), false, 'promotions/fetch/success')
          // cache for 60s TTL
          get().setCache(key, list, 60_000)
        } catch (e: any) {
          console.error('fetchPromotions error', e)
          set((s: RootState) => ({ ...s, error: e?.message || 'Error al cargar promociones', loading: false }), false, 'promotions/fetch/error')
        }
      },

      // Coupon slice
      couponCode: null,
      couponDiscountType: null,
      setCoupon: (code, discountType) => set((s: RootState) => ({
        ...s,
        couponCode: code,
        couponDiscountType: discountType
      }), false, 'coupon/set'),
      clearCoupon: () => set((s: RootState) => ({
        ...s,
        couponCode: null,
        couponDiscountType: null
      }), false, 'coupon/clear'),
      setCouponCode: (code) => set((s: RootState) => ({
        ...s,
        couponCode: code
      }), false, 'coupon/setCode'),
      setCouponData: (code, discountAmount, discountType) => set((s: RootState) => ({
        ...s,
        couponCode: code,
        couponDiscountType: discountType,
        couponDiscountAmount: discountAmount
      }), false, 'coupon/setData'),

      // UI slice
      isGlobalLoading: false,
      loadingMessage: undefined,
      loadingProgress: undefined,
      startLoading: (message) => set((s: RootState) => ({
        ...s,
        isGlobalLoading: true,
        loadingMessage: message || 'Cargando...'
      }), false, 'ui/startLoading'),
      stopLoading: () => set((s: RootState) => ({
        ...s,
        isGlobalLoading: false,
        loadingMessage: undefined,
        loadingProgress: undefined
      }), false, 'ui/stopLoading'),

      // Product editing slice
      currentProductId: null,
      formData: null,
      isEditing: false,
      isLoading: false,
      editingError: undefined,
      setCurrentProductId: (id) => set((s: RootState) => ({ ...s, currentProductId: id }), false, 'productEditing/setCurrentProductId'),
      setFormData: (data) => set((s: RootState) => ({ ...s, formData: data }), false, 'productEditing/setFormData'),
      patchFormData: (partial) => set((s: RootState) => ({
        ...s,
        formData: s.formData ? { ...s.formData, ...partial } : ({ ...partial } as EditingFormData)
      }), false, 'productEditing/patchFormData'),
      setIsEditing: (v) => set((s: RootState) => ({ ...s, isEditing: v }), false, 'productEditing/setIsEditing'),
      setIsLoading: (v) => set((s: RootState) => ({ ...s, isLoading: v }), false, 'productEditing/setIsLoading'),
      setEditingError: (msg) => set((s: RootState) => ({ ...s, editingError: msg }), false, 'productEditing/setEditingError'),
      resetEditing: () => set((s: RootState) => ({
        ...s,
        currentProductId: null,
        formData: null,
        isEditing: false,
        isLoading: false,
        editingError: undefined
      }), false, 'productEditing/resetEditing'),

      paymentMethod: 'CASH',
      setPaymentMethod: (m) => set((s: RootState) => ({ ...s, paymentMethod: m }), false, 'pos/setPaymentMethod'),
      discount: 0,
      setDiscount: (v) => set((s: RootState) => ({ ...s, discount: v }), false, 'pos/setDiscount'),
      discountType: 'PERCENTAGE',
      setDiscountType: (t) => set((s: RootState) => ({ ...s, discountType: t }), false, 'pos/setDiscountType'),
      notes: '',
      setNotes: (v) => set((s: RootState) => ({ ...s, notes: v }), false, 'pos/setNotes'),
      heldSales: [],
      addHeldSale: (sale) => set((s: RootState) => ({ ...s, heldSales: [...s.heldSales, sale] }), false, 'pos/addHeldSale'),
      removeHeldSale: (id) => set((s: RootState) => ({ ...s, heldSales: s.heldSales.filter(h => h.id !== id) }), false, 'pos/removeHeldSale'),
    }), 'RootStore')
  )
)

export const usePOSStore = useStore