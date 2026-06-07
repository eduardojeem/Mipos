'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  Truck,
  User,
  History,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { formatPaymentMethod } from '@/lib/orders/payment-methods';
import { NavBar } from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LoginAccessSection } from '@/components/auth/LoginAccessSection';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address?: string;
  subtotal: number;
  shipping_cost: number;
  fulfillment_type?: 'DELIVERY' | 'PICKUP';
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
  estimated_delivery_date?: string;
  order_items: OrderItem[];
}

interface PurchaseSummary {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

interface SearchHistoryItem {
  term: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ORDER_STATUSES = {
  PENDING: { label: 'Pendiente', icon: Clock, description: 'Tu pedido fue recibido y está siendo revisado.' },
  CONFIRMED: { label: 'Confirmado', icon: CheckCircle, description: 'El negocio confirmó tu compra.' },
  PREPARING: { label: 'Preparando', icon: Package, description: 'Tu pedido se está preparando.' },
  READY: { label: 'Listo', icon: CheckCircle, description: 'Tu pedido está listo para envío o retiro.' },
  SHIPPED: { label: 'Enviado', icon: Truck, description: 'Tu pedido va en camino.' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle, description: 'Tu pedido fue entregado.' },
  CANCELLED: { label: 'Cancelado', icon: AlertCircle, description: 'Este pedido fue cancelado.' },
} as const;

const ORDER_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'] as const;
const MAX_HISTORY = 5;

const EXTRA_PAYMENT_LABELS: Record<string, string> = {
  DIGITAL_WALLET: 'Billetera digital',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getProgress(status: string): number {
  if (status === 'CANCELLED') return -1;
  return ORDER_FLOW.indexOf(status as typeof ORDER_FLOW[number]);
}

function getRelativeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const now = Date.now();
    const diff = date.getTime() - now;
    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / 86400000);
    const hours = Math.floor((absDiff % 86400000) / 3600000);

    if (days === 0 && hours === 0) return diff >= 0 ? 'hoy' : 'hace momentos';
    if (days === 0) return diff >= 0 ? `en ${hours}h` : `hace ${hours}h`;
    if (days === 1) return diff >= 0 ? 'mañana' : 'ayer';
    return diff >= 0 ? `en ${days} días` : `hace ${days} días`;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function TrackOrderClient() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams?.get('orderNumber') || '';
  const [searchTerm, setSearchTerm] = useState(initialOrderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [myOrders, setMyOrders] = useState<PurchaseSummary[]>([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [copied, setCopied] = useState(false);
  const { config } = useBusinessConfig();
  const { toast } = useToast();
  const router = useRouter();
  const { tenantApiPath, tenantHref, tenantStorageScope } = useTenantPublicRouting();
  const { user, loading: authLoading } = useAuth();
  const autoSearchedRef = useRef(false);

  const primary = config.branding?.primaryColor || '#0f766e';

  // Namespace por tenant para el historial
  const storageKey = tenantStorageScope === 'default'
    ? 'order-track-history'
    : `order-track-history_${tenantStorageScope}`;

  // ── Historial ──
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  }, [storageKey]);

  const saveToHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((i) => i.term.toLowerCase() !== trimmed.toLowerCase());
      const updated = [{ term: trimmed, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [storageKey]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  // ── Fetch de pedido (reutilizable) ──
  const fetchOrder = useCallback(async (term: string): Promise<Order | null> => {
    const trimmed = term.trim();
    if (!trimmed) return null;

    const params = new URLSearchParams(
      trimmed.includes('@') ? { customerEmail: trimmed } : { orderNumber: trimmed },
    );
    const response = await fetch(`${tenantApiPath('/api/orders/public/track')}?${params}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('No se pudo consultar el pedido. Intenta de nuevo.');

    const data = await response.json();
    return data?.success && data?.data?.order ? data.data.order : null;
  }, [tenantApiPath]);

  // ── Buscar pedido ──
  const searchOrder = useCallback(async (term?: string) => {
    const query = (term ?? searchTerm).trim();
    if (!query) {
      toast({ title: 'Campo requerido', description: 'Ingresa un número de pedido o email.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrder(null);

    try {
      const result = await fetchOrder(query);
      if (result) {
        setOrder(result);
        saveToHistory(query);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Verifica tu conexión e intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, fetchOrder, saveToHistory, toast]);

  // ── Mis pedidos ──
  const loadMyOrders = useCallback(async () => {
    if (!user?.id) { setMyOrders([]); return; }
    try {
      setLoadingMyOrders(true);
      const response = await fetch(tenantApiPath('/api/profile/purchases?tenantOnly=true&limit=8'), { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      setMyOrders(response.ok && Array.isArray(data?.purchases) ? data.purchases : []);
    } catch {
      setMyOrders([]);
    } finally {
      setLoadingMyOrders(false);
    }
  }, [user?.id, tenantApiPath]);

  // ── Copiar link ──
  const copyTrackingLink = useCallback(() => {
    if (!order) return;
    const url = `${window.location.origin}${tenantHref(`/orders/track?orderNumber=${order.order_number}`)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast({ title: 'Link copiado', description: 'Puedes compartirlo para consultar el estado.' });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    });
  }, [order, tenantHref, toast]);

  // ── Effects ──
  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (autoSearchedRef.current || !initialOrderNumber) return;
    autoSearchedRef.current = true;
    searchOrder(initialOrderNumber);
  }, [initialOrderNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMyOrders(); }, [loadMyOrders]);

  const progress = order ? getProgress(order.status) : -1;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <NavBar config={config} activeSection="seguimiento" onNavigate={(id) => router.push(tenantHref(`/home#${id}`))} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* ═══════════════════════════════════════════════════════════════════
            Header integrado con búsqueda
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${primary}18` }}>
              <Package className="h-5 w-5" style={{ color: primary }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Seguí tu pedido
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ingresá tu número de pedido o el email que usaste al comprar.
              </p>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchOrder()}
                placeholder="Ej: ORD-001 o tu@email.com"
                className="h-12 rounded-xl pl-10 text-sm"
              />
            </div>
            <Button
              className="h-12 rounded-xl px-6 text-white"
              style={{ backgroundColor: primary }}
              onClick={() => searchOrder()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Buscar</span>
            </Button>
          </div>

          {/* Historial */}
          {searchHistory.length > 0 && !order ? (
            <div className="flex items-center gap-2 flex-wrap">
              <History className="h-3.5 w-3.5 text-slate-400" />
              {searchHistory.map((item) => (
                <button
                  key={item.timestamp}
                  onClick={() => { setSearchTerm(item.term); searchOrder(item.term); }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  {item.term}
                </button>
              ))}
              <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Login / Mis pedidos
           ═══════════════════════════════════════════════════════════════════ */}
        {!order && !notFound && !loading ? (
          <div className="space-y-6">
            {!authLoading && !user?.id ? (
              <LoginAccessSection
                title="Acceso para clientes"
                description="Iniciá sesión para ver tu historial completo de pedidos en esta tienda."
                types={['customer', 'guest-order']}
                returnUrl={tenantHref('/orders/track')}
                compact
                className="bg-transparent py-6"
              />
            ) : null}

            {user?.id ? (
              <Card className="rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    <Package className="h-4 w-4 text-slate-400" />
                    Mis pedidos
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={loadMyOrders} disabled={loadingMyOrders}>
                    {loadingMyOrders ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingMyOrders ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                    </div>
                  ) : myOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No hay pedidos en esta tienda aún.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {myOrders.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSearchTerm(p.orderNumber); searchOrder(p.orderNumber); }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <div>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">{p.orderNumber}</span>
                            <span className="ml-2 text-xs text-slate-400">
                              {p.createdAt ? getRelativeDate(p.createdAt) || format(new Date(p.createdAt), 'P', { locale: es }) : ''}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {formatPrice(p.total, config)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            Not found
           ═══════════════════════════════════════════════════════════════════ */}
        {notFound ? (
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="py-10 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
              <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">No encontramos tu pedido</h3>
              <p className="mt-2 max-w-sm mx-auto text-sm text-slate-500 dark:text-slate-400">
                Verificá el número de pedido o email. Si el problema persiste, contactá al negocio.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            Resultado del pedido
           ═══════════════════════════════════════════════════════════════════ */}
        {order ? (
          <div className="space-y-5">

            {/* Header del pedido + copiar link */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Pedido</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-50">{order.order_number}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {format(new Date(order.created_at), 'PPP', { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="border-0 bg-slate-900 text-white dark:bg-slate-700">
                  {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label || order.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={copyTrackingLink}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copied ? 'Copiado' : 'Link'}
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="p-5">
                {progress === -1 ? (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Pedido cancelado</p>
                      <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">
                        Si tenés preguntas, contactá al negocio directamente.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[17px] top-5 h-[calc(100%-40px)] w-0.5 bg-slate-100 dark:bg-slate-800" />
                    <div className="space-y-0.5">
                      {ORDER_FLOW.map((status, idx) => {
                        const info = ORDER_STATUSES[status];
                        const Icon = info.icon;
                        const done = idx < progress;
                        const active = idx === progress;
                        return (
                          <div
                            key={status}
                            className={`relative flex items-start gap-3 rounded-xl px-2 py-2.5 ${active ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                          >
                            <div
                              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                                active
                                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                  : done
                                  ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                  : 'border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {active ? (
                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                              ) : null}
                            </div>
                            <div className="pt-1">
                              <p className={`text-sm font-medium ${active ? 'text-slate-900 dark:text-slate-50' : done ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                {info.label}
                                {active ? (
                                  <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                    Actual
                                  </span>
                                ) : null}
                              </p>
                              {active ? (
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{info.description}</p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fecha estimada */}
                {order.estimated_delivery_date ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <Truck className="h-4 w-4" style={{ color: primary }} />
                    <span>
                      Entrega estimada: {format(new Date(order.estimated_delivery_date), 'PPP', { locale: es })}
                      {' '}
                      <span className="text-xs text-slate-400">
                        ({getRelativeDate(order.estimated_delivery_date) || ''})
                      </span>
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Detalle del cliente y pago */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" />{order.customer_name}</p>
                  <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" />{order.customer_email}</p>
                  {order.customer_phone ? <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" />{order.customer_phone}</p> : null}
                  {order.customer_address ? <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{order.customer_address}</p> : null}
                </div>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {EXTRA_PAYMENT_LABELS[order.payment_method] || formatPaymentMethod(order.payment_method)}
                  </p>
                  <p className="flex items-center gap-2">
                    {order.fulfillment_type === 'PICKUP' ? <Package className="h-3.5 w-3.5 text-slate-400" /> : <Truck className="h-3.5 w-3.5 text-slate-400" />}
                    {order.fulfillment_type === 'PICKUP' ? 'Retiro en local' : 'Delivery'}
                  </p>
                  <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400" />{getRelativeDate(order.created_at) || format(new Date(order.created_at), 'P', { locale: es })}</p>
                </div>
              </CardContent>
            </Card>

            {/* Productos */}
            <Card className="rounded-xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Productos ({order.order_items.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.product_name}</p>
                      <p className="text-xs text-slate-400">{formatPrice(item.unit_price, config)} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatPrice(item.subtotal, config)}</p>
                  </div>
                ))}

                <div className="space-y-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal, config)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>{order.fulfillment_type === 'PICKUP' ? 'Retiro' : 'Envío'}</span>
                    <span>{order.fulfillment_type === 'PICKUP' ? 'Sin costo' : formatPrice(order.shipping_cost, config)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-base font-bold text-slate-900 dark:text-slate-50">
                    <span>Total</span>
                    <span>{formatPrice(order.total, config)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      <Footer config={config} onNavigate={(id) => router.push(tenantHref(`/home#${id}`))} />
    </div>
  );
}
