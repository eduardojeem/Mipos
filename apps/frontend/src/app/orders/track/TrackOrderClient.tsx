'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Calendar, CheckCircle, Clock, CreditCard, Loader2, Mail, MapPin, Package, Phone, Search, Truck, User, History, X } from 'lucide-react';
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
import PageHero from '@/components/public-tenant/PageHero';
import { getTenantPublicContent } from '@/lib/public-site/tenant-public-config';
import { LoginAccessSection } from '@/components/auth/LoginAccessSection';
import { useAuth } from '@/hooks/use-auth';

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

const ORDER_STATUSES = {
  PENDING: { label: 'Pendiente', icon: Clock, description: 'Tu pedido fue recibido exitosamente y el negocio lo está revisando.' },
  CONFIRMED: { label: 'Confirmado', icon: CheckCircle, description: '¡El negocio confirmó tu compra! Ahora se prepara tu pedido.' },
  PREPARING: { label: 'Preparando', icon: Package, description: 'Estamos preparando tu pedido con mucho cuidado.' },
  READY: { label: 'Listo', icon: CheckCircle, description: 'Tu pedido está listo para ser enviado o retirado.' },
  SHIPPED: { label: 'Enviado', icon: Truck, description: '¡Tu pedido va en camino! Llegará pronto a tu destino.' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle, description: '¡Tu pedido ha sido entregado exitosamente! Esperamos que lo disfrutes.' },
  CANCELLED: { label: 'Cancelado', icon: AlertCircle, description: 'Este pedido fue cancelado.' },
} as const;

const EXTRA_PAYMENT_LABELS: Record<string, string> = {
  DIGITAL_WALLET: 'Billetera digital',
};

const STORAGE_KEY = 'order-track-history';
const MAX_HISTORY = 5;

interface SearchHistoryItem {
  term: string;
  timestamp: number;
}

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
  const { config } = useBusinessConfig();
  const content = getTenantPublicContent(config);
  const { toast } = useToast();
  const router = useRouter();
  const { tenantApiPath, tenantHref } = useTenantPublicRouting();
  const { user, loading: authLoading } = useAuth();
  const autoSearchedRef = useRef(false);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch {
      console.error('Error loading search history');
    }
  };

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const filtered = searchHistory.filter(item => item.term.toLowerCase() !== trimmed.toLowerCase());
    const newItem: SearchHistoryItem = { term: trimmed, timestamp: Date.now() };
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);

    setSearchHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      console.error('Error saving search history');
    }
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      console.error('Error clearing search history');
    }
  };

  const selectHistoryItem = (term: string) => {
    setSearchTerm(term);
    setOrder(null);
    setNotFound(false);
  };

  const loadMyOrders = async () => {
    if (!user?.id) {
      setMyOrders([]);
      return;
    }

    try {
      setLoadingMyOrders(true);
      const response = await fetch(tenantApiPath('/api/profile/purchases?tenantOnly=true&limit=8'), { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      setMyOrders(response.ok && data?.success !== false && Array.isArray(data?.purchases) ? data.purchases : []);
    } catch {
      setMyOrders([]);
    } finally {
      setLoadingMyOrders(false);
    }
  };

  const searchOrder = async () => {
    if (!searchTerm.trim()) {
      toast({ title: 'Campo requerido', description: 'Por favor, ingresa un número de pedido o email para buscar.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      setNotFound(false);
      setOrder(null);
      const params = new URLSearchParams(searchTerm.includes('@') ? { customerEmail: searchTerm } : { orderNumber: searchTerm });
      const response = await fetch(`${tenantApiPath('/api/orders/public/track')}?${params}`);
      if (response.status === 404) { setNotFound(true); return; }
      if (!response.ok) throw new Error('Ocurrió un problema al consultar el pedido. Por favor, inténtalo de nuevo más tarde.');
      const data = await response.json();
      if (data.success && data.data.order) {
        setOrder(data.data.order);
        saveToHistory(searchTerm);
      }
      else setNotFound(true);
    } catch (error) {
      toast({ title: 'No se pudo buscar el pedido', description: error instanceof Error ? error.message : 'Por favor, verifica tu conexión a internet e inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    if (autoSearchedRef.current) return;
    if (!initialOrderNumber) return;
    autoSearchedRef.current = true;
    void searchOrder();
  }, [initialOrderNumber]);

  useEffect(() => {
    void loadMyOrders();
  }, [user?.id, tenantApiPath]);

  const currentProgress = (status: string) => {
    const orderFlow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'];
    return status === 'CANCELLED' ? -1 : orderFlow.indexOf(status);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar config={config} activeSection="seguimiento" onNavigate={(sectionId) => router.push(tenantHref(`/home#${sectionId}`))} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          config={config}
          badge={content.heroBadge || 'Pedidos'}
          title={content.orderTrackingTitle || 'Sigue tu pedido'}
          description={content.orderTrackingDescription || 'Consulta el estado de tu compra con una vista clara, cronológica y pensada para clientes finales.'}
          actions={[]}
          metrics={[{ label: 'Canal', value: 'Público', helpText: 'Buscá por número de pedido o por el email usado al comprar.' }]}
        />

        <div className="mt-8 space-y-6">
          <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && searchOrder()}
                    placeholder="Número de pedido o email"
                    className="h-11 pl-10 text-sm"
                  />
                </div>
                <Button className="h-11 rounded-lg px-6 text-white shadow-none" style={{ backgroundColor: config.branding?.primaryColor || '#0f766e' }} onClick={searchOrder} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Buscar
                </Button>
              </div>
            </CardContent>
          </Card>

          {searchHistory.length > 0 && (
            <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  <History className="h-4 w-4 text-slate-500" />
                  Búsquedas recientes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpiar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item) => (
                    <Button
                      key={item.timestamp}
                      variant="outline"
                      size="sm"
                      onClick={() => selectHistoryItem(item.term)}
                      className="h-9 px-3 text-sm"
                    >
                      {item.term}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!authLoading && !user?.id ? (
            <LoginAccessSection
              title="Acceso para pedidos"
              description="Puedes buscar un pedido como invitado con numero o email, o iniciar sesion como cliente para centralizar historial y recompra."
              types={['customer', 'guest-order']}
              returnUrl={tenantHref('/orders/track')}
              compact
              className="bg-transparent py-8"
            />
          ) : null}

          {user?.id ? (
            <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-50">
                  <Package className="h-4 w-4 text-slate-500" />
                  Mis pedidos en esta tienda
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={loadMyOrders} disabled={loadingMyOrders}>
                  {loadingMyOrders ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Actualizar
                </Button>
              </CardHeader>
              <CardContent>
                {loadingMyOrders ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : myOrders.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Todavia no hay pedidos asociados a tu usuario en esta tienda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myOrders.map((purchase) => (
                      <button
                        key={purchase.id}
                        type="button"
                        onClick={() => {
                          const orderNumber = purchase.orderNumber;
                          setSearchTerm(orderNumber);
                          setOrder(null);
                          setNotFound(false);
                          void (async () => {
                            try {
                              setLoading(true);
                              const params = new URLSearchParams({ orderNumber });
                              const response = await fetch(`${tenantApiPath('/api/orders/public/track')}?${params}`);
                              if (response.status === 404) {
                                setNotFound(true);
                                return;
                              }
                              if (!response.ok) throw new Error('Ocurrió un problema al consultar el pedido. Por favor, inténtalo de nuevo más tarde.');
                              const data = await response.json();
                              if (data.success && data.data.order) {
                                setOrder(data.data.order);
                                saveToHistory(orderNumber);
                              } else {
                                setNotFound(true);
                              }
                            } catch (error) {
                              toast({ title: 'No se pudo buscar el pedido', description: error instanceof Error ? error.message : 'Por favor, verifica tu conexión a internet e inténtalo de nuevo.', variant: 'destructive' });
                            } finally {
                              setLoading(false);
                            }
                          })();
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{purchase.orderNumber}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {purchase.status} / {purchase.createdAt ? format(new Date(purchase.createdAt), 'P', { locale: es }) : 'Sin fecha'}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {formatPrice(purchase.total, config)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {notFound ? (
            <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="py-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-400 dark:text-amber-500" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">No encontramos tu pedido</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Verifica que hayas ingresado correctamente el número de pedido o el email que usaste al comprar. 
                  Si el problema persiste, por favor contacta al negocio.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {order ? (
            <div className="space-y-6">
              <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-base font-semibold text-slate-900 dark:text-slate-50">Pedido {order.order_number}</span>
                    <Badge className="w-fit border-0 bg-slate-900 text-white text-xs dark:bg-slate-700">
                      {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES]?.label || order.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />{format(new Date(order.created_at), 'PPP', { locale: es })}</p>
                    <p className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400 dark:text-slate-500" />{order.customer_name}</p>
                    <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />{order.customer_email}</p>
                    <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />{order.customer_phone}</p>
                    <p className="flex items-center gap-2">
                      {order.fulfillment_type === 'PICKUP' ? <Package className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                      {order.fulfillment_type === 'PICKUP' ? 'Retiro en local' : 'Delivery'}
                    </p>
                    {order.customer_address ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />{order.customer_address}</p> : null}
                  </div>
                  <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500" />{EXTRA_PAYMENT_LABELS[order.payment_method] || formatPaymentMethod(order.payment_method)}</p>
                    {order.estimated_delivery_date ? <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><Truck className="h-4 w-4 text-slate-400 dark:text-slate-500" />Entrega estimada: {format(new Date(order.estimated_delivery_date), 'PPP', { locale: es })}</p> : null}
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Total</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatPrice(order.total, config)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">Estado del pedido</CardTitle></CardHeader>
                <CardContent className="space-y-2 pb-6">
                  {currentProgress(order.status) === -1 ? (
                    <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                      <AlertCircle className="h-7 w-7 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-base">Pedido cancelado</p>
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          Este pedido fue cancelado. Si crees que se trata de un error o tienes preguntas, por favor contacta directamente al negocio.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[21px] top-6 h-[calc(100%-48px)] w-0.5 bg-slate-100 dark:bg-slate-800" />
                      <div className="space-y-1">
                        {(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'] as const).map((status, index) => {
                          const info = ORDER_STATUSES[status];
                          const Icon = info.icon;
                          const progress = currentProgress(order.status);
                          const done = index < progress;
                          const active = index === progress;
                          return (
                            <div key={status} className={`relative flex items-start gap-4 rounded-2xl px-3 py-3 transition-colors ${active ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}>
                              <div
                                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                                  active
                                    ? 'border-slate-950 bg-slate-950 text-white shadow-md dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                                    : done
                                    ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                    : 'border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
                                }`}
                              >
                                <Icon className="h-5 w-5" />
                                {active ? (
                                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                                ) : null}
                              </div>
                              <div className="min-w-0 pt-1.5">
                                <p className={`text-sm font-semibold ${active ? 'text-slate-950 dark:text-slate-50' : done ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>
                                  {info.label}
                                  {active ? <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Actual</span> : null}
                                </p>
                                <p className={`mt-0.5 text-sm ${active ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>{info.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
                <CardHeader><CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">Productos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.product_name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatPrice(item.unit_price, config)} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{formatPrice(item.subtotal, config)}</p>
                    </div>
                  ))}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal, config)}</span></div>
                    <div className="flex justify-between">
                      <span>{order.fulfillment_type === 'PICKUP' ? 'Retiro' : 'Envío'}</span>
                      <span>{order.fulfillment_type === 'PICKUP' ? 'Sin costo' : formatPrice(order.shipping_cost, config)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-slate-900 dark:text-slate-50"><span>Total</span><span>{formatPrice(order.total, config)}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </main>

      <Footer config={config} onNavigate={(sectionId) => router.push(tenantHref(`/home#${sectionId}`))} />
    </div>
  );
}
