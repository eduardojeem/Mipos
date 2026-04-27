'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ExternalLink, Eye, Smartphone, Tablet, Monitor, AlertCircle, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import api, { getErrorMessage } from '@/lib/api';
import { createLogger } from '@/lib/logger';
import { getSelectedOrganizationId } from '@/lib/organization-context';

const INITIAL_DISPLAY_COUNT = 4;

interface Promotion {
  id: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface OfferProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  brand?: string;
  imageUrl?: string;
  category?: string;
  discountedPrice: number;
  savings: number;
}

const logger = createLogger('OfferPreview');

const VIEW_MODES = {
  desktop: { width: '100%', icon: Monitor, label: 'Desktop', description: 'Vista de escritorio' },
  tablet: { width: '768px', icon: Tablet, label: 'Tablet', description: 'Vista tablet (768px)' },
  mobile: { width: '375px', icon: Smartphone, label: 'Movil', description: 'Vista movil (375px)' },
} as const;

function OfferProductCard({
  product,
  discountType,
  discountValue,
}: {
  product: OfferProduct;
  discountType: Promotion['discountType'];
  discountValue: number;
}) {
  const isOutOfStock = product.stock === 0;

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}>
      <CardContent className="p-0">
        <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Badge className="bg-red-600 text-white text-xs">
              -{discountType === 'PERCENTAGE' ? `${discountValue}%` : `$${discountValue}`}
            </Badge>
            {product.stock != null && product.stock <= 5 && product.stock > 0 && (
              <Badge variant="destructive" className="text-xs">Solo {product.stock}</Badge>
            )}
            {isOutOfStock && (
              <Badge variant="secondary" className="text-xs">Agotado</Badge>
            )}
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="font-semibold text-sm line-clamp-2">{product.name}</p>
          {product.brand && (
            <Badge variant="outline" className="text-xs">{product.brand}</Badge>
          )}
          {product.category && (
            <Badge variant="secondary" className="text-xs">{product.category}</Badge>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-green-600">${product.discountedPrice.toFixed(2)}</span>
            <span className="text-sm text-slate-400 line-through">${product.price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-green-600 font-medium">Ahorra ${product.savings.toFixed(2)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function OfferProductSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/3" />
      </div>
    </Card>
  );
}

export function OfferPreview({ promotion }: { promotion: Promotion }) {
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<keyof typeof VIEW_MODES>('desktop');
  const [sortBy, setSortBy] = useState<'savings' | 'price' | 'name'>('savings');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showOutOfStock, setShowOutOfStock] = useState(true);

  const calculateDiscountedPrice = useCallback(
    (price: number) =>
      promotion.discountType === 'PERCENTAGE'
        ? price * (1 - promotion.discountValue / 100)
        : Math.max(0, price - promotion.discountValue),
    [promotion.discountType, promotion.discountValue],
  );

  const status = useMemo(() => {
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    if (!promotion.isActive) return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
  }, [promotion.isActive, promotion.startDate, promotion.endDate]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const orgId = getSelectedOrganizationId();
      const response = await api.get(`/promotions/${promotion.id}/products`, {
        headers: orgId ? { 'x-organization-id': orgId } : {},
      });

      if (!response.data?.success) {
        setProducts([]);
        return;
      }

      const raw: Array<Record<string, unknown>> = response.data.data || [];
      setProducts(
        raw.map((product) => {
          const basePrice = Number(product.price ?? product.salePrice ?? 0);
          const discountedPrice = calculateDiscountedPrice(basePrice);

          return {
            id: String(product.id || ''),
            name: String(product.name || ''),
            price: basePrice,
            stock: product.stock != null ? Number(product.stock) : undefined,
            brand: typeof product.brand === 'string' ? product.brand : undefined,
            imageUrl: typeof product.imageUrl === 'string'
              ? product.imageUrl
              : typeof product.image === 'string'
                ? product.image
                : undefined,
            category: typeof product.category === 'string' ? product.category : undefined,
            discountedPrice,
            savings: basePrice - discountedPrice,
          };
        }),
      );
    } catch (err) {
      const apiError = err as {
        response?: { status?: number; data?: unknown };
        code?: string;
      };
      const message = getErrorMessage(err);

      logger.error('Error fetching products:', {
        message,
        code: apiError.code,
        status: apiError.response?.status,
        details: apiError.response?.data,
      });

      setError(message || 'No se pudieron cargar los productos de esta promocion.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [promotion.id, calculateDiscountedPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean) as string[])).sort(),
    [products],
  );

  const displayedProducts = useMemo(() => {
    let list = [...products];
    if (categoryFilter !== 'all') list = list.filter((product) => product.category === categoryFilter);
    if (!showOutOfStock) list = list.filter((product) => product.stock == null || product.stock > 0);

    list.sort((a, b) => {
      if (sortBy === 'savings') return b.savings - a.savings;
      if (sortBy === 'price') return a.discountedPrice - b.discountedPrice;
      return a.name.localeCompare(b.name);
    });

    return list.slice(0, INITIAL_DISPLAY_COUNT);
  }, [products, categoryFilter, showOutOfStock, sortBy]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-600" />
            Vista Previa de Oferta
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">Asi se vera en el sitio publico</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`/offers?promotion=${promotion.id}`, '_blank')}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir en sitio
        </Button>
      </div>

      {status !== 'active' && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                {status === 'scheduled' && 'Esta promocion aun no ha comenzado'}
                {status === 'expired' && 'Esta promocion ha expirado'}
                {status === 'inactive' && 'Esta promocion esta inactiva'}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                Los clientes no veran esta oferta hasta que este activa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2">
        {(Object.entries(VIEW_MODES) as [keyof typeof VIEW_MODES, typeof VIEW_MODES[keyof typeof VIEW_MODES]][]).map(([mode, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="gap-2"
              title={config.description}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{config.label}</span>
            </Button>
          );
        })}
      </div>

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Mayor ahorro</SelectItem>
              <SelectItem value="price">Menor precio</SelectItem>
              <SelectItem value="name">Nombre A-Z</SelectItem>
            </SelectContent>
          </Select>

          {categories.length > 1 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-oos"
              checked={showOutOfStock}
              onCheckedChange={(value) => setShowOutOfStock(value === true)}
            />
            <label htmlFor="show-oos" className="text-sm cursor-pointer select-none">
              Mostrar sin stock
            </label>
          </div>
        </div>
      )}

      <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 flex justify-center">
        <div
          style={{ width: VIEW_MODES[viewMode].width, maxWidth: '100%', transition: 'width 0.3s ease' }}
          className="bg-white dark:bg-slate-950 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{promotion.name}</h2>
                <p className="text-sm text-slate-500 mt-1">{promotion.description}</p>
              </div>
              <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shrink-0">
                {promotion.discountType === 'PERCENTAGE'
                  ? `-${promotion.discountValue}%`
                  : `-$${promotion.discountValue}`}
              </Badge>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => <OfferProductSkeleton key={index} />)}
              </div>
            ) : displayedProducts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                  <Package className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">
                    {products.length === 0
                      ? 'No hay productos asociados a esta promocion'
                      : 'Ningun producto coincide con los filtros aplicados'}
                  </p>
                  {products.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Agrega productos en la pestana "Productos"
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {displayedProducts.map((product) => (
                    <OfferProductCard
                      key={product.id}
                      product={product}
                      discountType={promotion.discountType}
                      discountValue={promotion.discountValue}
                    />
                  ))}
                </div>
                {products.length > INITIAL_DISPLAY_COUNT && (
                  <p className="text-center text-sm text-slate-400 pt-2">
                    Y {products.length - INITIAL_DISPLAY_COUNT} producto{products.length - INITIAL_DISPLAY_COUNT !== 1 ? 's' : ''} mas...
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Vista previa aproximada. El diseno final puede variar segun el dispositivo del cliente.
      </p>
    </div>
  );
}
