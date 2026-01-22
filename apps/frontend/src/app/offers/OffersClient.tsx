"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";
import {
    Calendar,
    Clock,
    Info,
    Package,
    Percent,
    Tag,
    Sparkles,
    Flame,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    ShoppingCart,
    ArrowRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { useBusinessConfig, useCurrencyFormatter } from "@/contexts/BusinessConfigContext";
import { NavBar } from "@/app/home/components/NavBar";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDebounce } from "@/hooks/useDebounce";
import { createClient } from "@/lib/supabase/client";
import { ExpiringOffersNotification } from "@/components/offers/expiring-offers-notification";
import { validatePromotion } from "@/lib/offers";
import PublicOffersCarousel from "./components/PublicOffersCarousel";
import { useCatalogCart } from "@/hooks/useCatalogCart";

// Tipos
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING";

export interface Product {
    id: string;
    name: string;
    sale_price?: number;
    retail_price?: number;
    price?: number;
    stock_quantity?: number;
    category_id?: string;
    sku?: string;
    images?: { url: string }[];
    brand?: string;
    categoryName?: string;
    image?: string; // Compatibilidad con estructura antigua
}

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    discountType: DiscountType;
    discountValue?: number;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usageCount?: number;
}

export interface OfferItem {
    product: Product;
    promotion: Promotion;
    basePrice: number;
    offerPrice: number;
    discountPercent: number;
}

interface OffersClientProps {
    initialOffers: OfferItem[];
    initialCategories: { id: string; name: string }[];
}

export default function OffersClient({ initialOffers, initialCategories }: OffersClientProps) {
    const { config } = useBusinessConfig();
    const formatCurrency = useCurrencyFormatter();
    const router = useRouter();
    const searchParams = useSearchParams();
    const reduceMotion = usePrefersReducedMotion();
    const { toast } = useToast();
    const supabase = createClient();
    
    // ✅ Hook del carrito para sincronización automática
    const { addToCart } = useCatalogCart();

    // Estado
    const [offers, setOffers] = useState<OfferItem[]>(initialOffers);
    const [categories] = useState(initialCategories);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1
    });

    // Filtros sincronizados con URL
    const [search, setSearch] = useState(searchParams?.get('search') || "");
    const [category, setCategory] = useState<string>(searchParams?.get('category') || "all");
    const [sort, setSort] = useState<string>(searchParams?.get('sort') || "best_savings");
    const [status, setStatus] = useState<string>(searchParams?.get('status') || "active");

    useEffect(() => {
        try {
            if (!searchParams?.get('category')) {
                const savedCat = localStorage.getItem('offers.category');
                if (savedCat) setCategory(savedCat);
            }
            if (!searchParams?.get('sort')) {
                const savedSort = localStorage.getItem('offers.sort');
                if (savedSort) setSort(savedSort);
            }
            if (!searchParams?.get('status')) {
                const savedStatus = localStorage.getItem('offers.status');
                if (savedStatus) setStatus(savedStatus);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('offers.category', category);
            localStorage.setItem('offers.sort', sort);
            localStorage.setItem('offers.status', status);
        } catch {}
    }, [category, sort, status]);

    // Debounce para búsqueda - optimización de rendimiento
    const debouncedSearch = useDebounce(search, 300);

    // UI
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<OfferItem | null>(null);
    const [ariaLive, setAriaLive] = useState('');

    // Fetch de ofertas desde API con filtros server-side
    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                status: status,
                search: debouncedSearch,
                category: category,
                sort: sort
            });

            const response = await fetch(`/api/offers?${params}`);
            const result = await response.json();

            if (result.success) {
                setOffers(result.data);
                setPagination(prev => ({
                    ...prev,
                    total: result.pagination.total,
                    totalPages: result.pagination.totalPages
                }));

                // Actualizar URL con filtros actuales
                const newParams = new URLSearchParams({
                    status: status,
                    search: debouncedSearch,
                    category: category,
                    sort: sort,
                    page: pagination.page.toString()
                });
                router.replace(`/offers?${newParams}`, { scroll: false });
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Error al cargar ofertas",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error fetching offers:", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar las ofertas",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, status, debouncedSearch, category, sort, router, toast]);

    // Cargar ofertas cuando cambien los filtros
    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    // Usar datos iniciales solo en primera carga
    useEffect(() => {
        if (initialOffers.length > 0 && offers.length === 0) {
            setOffers(initialOffers);
        }
    }, [initialOffers, offers.length]);

    // Filtrado en cliente solo para datos iniciales (fallback)
    const filteredOffers = useMemo(() => {
        if (offers.length === 0 && initialOffers.length > 0) {
            let result = [...initialOffers];

            // Búsqueda
            if (debouncedSearch.trim()) {
                const q = debouncedSearch.toLowerCase();
                result = result.filter(item =>
                    item.product.name.toLowerCase().includes(q) ||
                    item.promotion.name.toLowerCase().includes(q)
                );
            }

            // Categoría
            if (category !== "all") {
                result = result.filter(item => String(item.product.category_id) === category);
            }

            // Ordenamiento
            result.sort((a, b) => {
                switch (sort) {
                    case "best_savings":
                        return (b.basePrice - b.offerPrice) - (a.basePrice - a.offerPrice);
                    case "highest_discount":
                        return b.discountPercent - a.discountPercent;
                    case "price_low_high":
                        return a.offerPrice - b.offerPrice;
                    case "price_high_low":
                        return b.offerPrice - a.offerPrice;
                    case "ending_soon":
                        const endA = a.promotion.endDate ? new Date(a.promotion.endDate).getTime() : Infinity;
                        const endB = b.promotion.endDate ? new Date(b.promotion.endDate).getTime() : Infinity;
                        return endA - endB;
                    default:
                        return 0;
                }
            });

            return result;
        }
        return offers;
    }, [offers, initialOffers, debouncedSearch, category, sort]);

    const featuredOffers = useMemo(() => filteredOffers.slice(0, 3), [filteredOffers]);

    // ✅ Función addToCart ahora viene del hook useCatalogCart
    // Esto asegura sincronización automática con el CartButton

    // Formateo de tiempo restante
    const getTimeRemaining = (endDate?: string) => {
        if (!endDate) return null;
        const end = new Date(endDate);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) return "Finalizada";
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 0) return `${days} días restantes`;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return `${hours} horas restantes`;
    };

    // Calcular ofertas por expirar (menos de 24 horas)
    const expiringOffers = useMemo(() => {
        return filteredOffers
            .filter(offer => {
                if (!offer.promotion) return false;
                const validation = validatePromotion(offer.promotion);
                return validation.hoursRemaining !== null &&
                    validation.hoursRemaining > 0 &&
                    validation.hoursRemaining <= 24;
            })
            .map(offer => ({
                id: offer.product.id,
                productName: offer.product.name,
                promotionName: offer.promotion?.name || 'Oferta Especial',
                endDate: offer.promotion?.endDate!,
                discountPercent: offer.discountPercent,
                hoursRemaining: validatePromotion(offer.promotion!).hoursRemaining!
            }));
    }, [filteredOffers]);

    const toCartProduct = useCallback((item: OfferItem) => {
        const rawBase = Number(item.basePrice ?? NaN);
        const rawOffer = Number(item.offerPrice ?? NaN);
        const productPrice = Number((item.product as any).price ?? (item.product as any).retail_price ?? NaN);
        const base = Number.isFinite(rawBase) && rawBase > 0 ? rawBase : (Number.isFinite(productPrice) && productPrice > 0 ? productPrice : 0);
        const offer = Number.isFinite(rawOffer) ? rawOffer : NaN;
        const effectiveOffer = base > 0 && offer > 0 && offer < base ? offer : undefined;
        const image = item.product.images?.[0]?.url || item.product.image || "/api/placeholder/300/300";
        const stock = (item as any).product?.stockQuantity ?? item.product.stock_quantity ?? 999;
        const active = (item as any).product?.isActive ?? true;
        return {
            id: String(item.product.id || ''),
            name: String(item.product.name || 'Producto'),
            sale_price: base > 0 ? base : (offer > 0 ? offer : 0),
            offer_price: effectiveOffer,
            image_url: image,
            stock_quantity: Number(stock || 0),
            is_active: !!active,
        } as any;
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 dark:from-slate-950 dark:via-purple-950/50 dark:to-slate-900 font-sans">
            <NavBar
                config={config}
                activeSection="ofertas"
                onNavigate={(sectionId) => router.push(`/home#${sectionId}`)}
            />

            <main className="container mx-auto px-4 py-8 space-y-12">
                <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{ariaLive}</div>

                {/* Notificaciones de ofertas por expirar */}
                <ExpiringOffersNotification
                    offers={expiringOffers}
                    onViewOffer={(offerId) => {
                        const offer = filteredOffers.find(o => o.product.id === offerId);
                        if (offer) {
                            setSelectedItem(offer);
                            setDetailOpen(true);
                        }
                    }}
                    className="mb-6"
                />

                {/* Header Moderno */}
                <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 opacity-90" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40" />

                    <div className="relative z-10 p-8 md:p-16 max-w-3xl text-white">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <Badge className="mb-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border-white/50 text-white px-3 py-1 text-sm animate-pulse">
                                <Flame className="w-4 h-4 mr-1 fill-current" /> Ofertas Hot
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight drop-shadow-lg">
                                Ahorra en grande <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                                    en tus favoritos
                                </span>
                            </h1>
                            <p className="text-lg text-white/90 mb-8 max-w-xl leading-relaxed font-medium">
                                Descubre descuentos exclusivos por tiempo limitado. Calidad premium a precios increíbles, actualizados en tiempo real.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <Button size="lg" className="bg-white text-violet-600 hover:bg-white/90 font-bold rounded-full px-8 shadow-lg shadow-black/20">
                                    Ver Todo
                                </Button>
                                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/20 rounded-full px-8 backdrop-blur-sm">
                                    Más Vendidos
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Carrusel de Ofertas Destacadas */}
                <PublicOffersCarousel
                    onAddToCart={(productLike: any) => {
                        const price = Number((productLike as any).offer_price ?? (productLike as any).sale_price ?? 0);
                        addToCart(productLike as any, 1);
                        setAriaLive(`Producto agregado: ${String((productLike as any).name)} — ${formatCurrency(price)}`);
                    }}
                    onViewDetails={(item) => {
                        // Convert carousel item to OfferItem format
                        const offerItem: OfferItem = {
                            product: {
                                ...item.product,
                                sale_price: item.basePrice,
                                price: item.basePrice,
                            },
                            promotion: {
                                ...item.promotion,
                                discountType: item.promotion.discountType as DiscountType,
                            },
                            basePrice: item.basePrice,
                            offerPrice: item.offerPrice,
                            discountPercent: item.discountPercent,
                        };
                        setSelectedItem(offerItem);
                        setDetailOpen(true);
                    }}
                />

                {/* Barra de Herramientas Sticky - Mejorada para móviles */}
                <div className="sticky top-16 z-30 -mx-4 px-3 sm:px-4 md:mx-0">
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
                        {/* Campo de búsqueda - Full width en móviles */}
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <Input
                                placeholder="Buscar ofertas..."
                                className="pl-10 bg-transparent border-slate-200 dark:border-slate-700 focus-visible:ring-rose-500 text-sm sm:text-base"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Controles de filtro - Scroll horizontal en móviles */}
                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="min-w-[120px] sm:w-[140px] border-slate-200 dark:border-slate-700 text-sm">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activas</SelectItem>
                                    <SelectItem value="upcoming">Próximas</SelectItem>
                                    <SelectItem value="ended">Finalizadas</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="min-w-[140px] sm:w-[160px] border-slate-200 dark:border-slate-700 text-sm">
                                    <SelectValue placeholder="Categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas las categorías</SelectItem>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={sort} onValueChange={setSort}>
                                <SelectTrigger className="min-w-[140px] sm:w-[160px] border-slate-200 dark:border-slate-700 text-sm">
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="best_savings">Mayor Ahorro</SelectItem>
                                    <SelectItem value="highest_discount">% Descuento</SelectItem>
                                    <SelectItem value="price_low_high">Precio: Bajo a Alto</SelectItem>
                                    <SelectItem value="ending_soon">Termina Pronto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Grid de Ofertas */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Sparkles className="w-5 h-5 text-rose-500" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explora las Ofertas</h2>
                        <Badge variant="outline" className="ml-2 bg-white/50 backdrop-blur-sm" aria-live="polite" role="status">
                            {filteredOffers.length} {filteredOffers.length === 1 ? 'oferta' : 'ofertas'}
                        </Badge>
                    </div>

                    {filteredOffers.length === 0 ? (
                        <div className="text-center py-12 sm:py-20 bg-white dark:bg-slate-900 rounded-xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Package className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-3 sm:mb-4" />
                            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">No se encontraron ofertas</h3>
                            <p className="text-slate-500 text-sm sm:text-base">Intenta ajustar tus filtros de búsqueda.</p>
                        </div>
                    ) : (
                        <div className="h-[500px] sm:h-[600px] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                            <VirtualizedGrid
                                items={filteredOffers}
                                renderItem={(item, index) => {
                                    const img = item.product.images?.[0]?.url || item.product.image || "/api/placeholder/400/400";
                                    const timeLeft = getTimeRemaining(item.promotion.endDate);

                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="group p-1 sm:p-2"
                                        >
                                            <Card className="h-full overflow-hidden border border-white/50 dark:border-white/10 shadow-sm hover:shadow-lg sm:hover:shadow-2xl transition-all duration-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl sm:rounded-2xl group-hover:-translate-y-1 sm:group-hover:-translate-y-2 group-hover:shadow-violet-500/20">
                                                <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                                                    <Image
                                                        src={img}
                                                        alt={item.product.name}
                                                        fill
                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                        loading="lazy"
                                                    />

                                                    {/* Badges Superpuestos */}
                                                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-2">
                                                        <Badge className="bg-rose-500 text-white border-none shadow-lg backdrop-blur-sm text-xs sm:text-sm">
                                                            -{item.discountPercent}%
                                                        </Badge>
                                                        {timeLeft && (
                                                            <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] sm:text-xs font-medium shadow-sm">
                                                                <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" /> {timeLeft}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Acción Rápida - Siempre visible en móviles */}
                                                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 sm:translate-y-12 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                        <Button
                                                            size="icon"
                                                            className="rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg h-8 w-8 sm:h-10 sm:w-10 transition-all duration-200 hover:scale-105"
                                                            onClick={() => {
                                                                const p = toCartProduct(item);
                                                                addToCart(p, 1);
                                                                const price = Number((p as any).offer_price ?? (p as any).sale_price ?? 0);
                                                                setAriaLive(`Producto agregado: ${String((p as any).name)} — ${formatCurrency(price)}`);
                                                            }}
                                                        >
                                                            <ShoppingCart className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <CardContent className="p-3 sm:p-5">
                                                    <div className="mb-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-500 transition-colors text-sm sm:text-base">
                                                            {item.product.name}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 text-[11px] sm:text-xs">
                                                            {item.product.categoryName || "General"}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-baseline gap-2 mb-3 sm:mb-4">
                                                        <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
                                                            {formatCurrency(item.offerPrice)}
                                                        </span>
                                                        {item.basePrice > item.offerPrice && (
                                                            <span className="text-xs sm:text-sm text-slate-400 line-through decoration-slate-400/50">
                                                                {formatCurrency(item.basePrice)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button
                                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105 text-xs sm:text-sm h-8 sm:h-10"
                                                            onClick={() => {
                                                                const p = toCartProduct(item);
                                                                addToCart(p, 1);
                                                                const price = Number((p as any).offer_price ?? (p as any).sale_price ?? 0);
                                                                setAriaLive(`Producto agregado: ${String((p as any).name)} — ${formatCurrency(price)}`);
                                                            }}
                                                        >
                                                            Agregar
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="rounded-lg sm:rounded-xl border-slate-200 dark:border-slate-700 h-8 w-8 sm:h-10 sm:w-10"
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setDetailOpen(true);
                                                            }}
                                                        >
                                                            <Info className="w-5 h-5 text-slate-500" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                }}
                                columnWidth={280}
                                rowHeight={500}
                                className="rounded-2xl"
                                emptyMessage="No se encontraron ofertas con los filtros actuales"
                            />
                        </div>
                    )}

                    {/* Paginación */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                                disabled={pagination.page === 1 || loading}
                                className="flex items-center gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </Button>

                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <span className="font-medium">Página {pagination.page} de {pagination.totalPages}</span>
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, prev.totalPages) }))}
                                disabled={pagination.page === pagination.totalPages || loading}
                                className="flex items-center gap-2"
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </section>

            </main>

            {/* Modal de Detalles */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 border-0">
                    {selectedItem && (
                        <div className="bg-white dark:bg-slate-900">
                            <div className="relative h-64 bg-slate-100">
                                <Image
                                    src={selectedItem.product.images?.[0]?.url || selectedItem.product.image || "/api/placeholder/600/400"}
                                    alt={selectedItem.product.name}
                                    fill
                                    className="object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-4 left-4 text-white">
                                    <Badge className="bg-rose-500 border-none mb-2">-{selectedItem.discountPercent}% OFF</Badge>
                                    <h2 className="text-2xl font-bold">{selectedItem.product.name}</h2>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                    <div>
                                        <p className="text-sm text-slate-500">Precio Oferta</p>
                                        <p className="text-2xl font-black text-rose-600">{formatCurrency(selectedItem.offerPrice)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Precio Regular</p>
                                        <p className="text-lg line-through text-slate-400">{formatCurrency(selectedItem.basePrice)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-rose-500" />
                                        <span>Promoción: <strong>{selectedItem.promotion.name}</strong></span>
                                    </div>
                                    {selectedItem.promotion.endDate && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-rose-500" />
                                            <span>Válido hasta: {new Date(selectedItem.promotion.endDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-rose-500" />
                                        <span>Stock disponible: {selectedItem.product.stock_quantity || 'Consultar'}</span>
                                    </div>
                                </div>

                                <Button className="w-full rounded-xl py-6 text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg" onClick={() => { if (selectedItem) { const p = toCartProduct(selectedItem); addToCart(p, 1); const price = Number((p as any).offer_price ?? (p as any).sale_price ?? 0); setAriaLive(`Producto agregado: ${String((p as any).name)} — ${formatCurrency(price)}`); setDetailOpen(false); } }}>
                                    Agregar al Carrito
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
