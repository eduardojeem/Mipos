'use client';

import { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle, Clock, CreditCard, Loader2, Mail, MapPin, Package, Phone, Search, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { formatPrice } from '@/utils/formatters';
import { NavBar } from '@/app/home/components/NavBar';
import { Footer } from '@/app/home/components/Footer';
import { useTenantPublicRouting } from '@/hooks/useTenantPublicRouting';
import { useRouter } from 'next/navigation';
import PageHero from '@/components/public-tenant/PageHero';
import { getTenantPublicContent } from '@/lib/public-site/tenant-public-config';

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
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
  estimated_delivery_date?: string;
  order_items: OrderItem[];
}

const ORDER_STATUSES = {
  PENDING: { label: 'Pendiente', icon: Clock, description: 'Tu pedido fue recibido y está en revisión.' },
  CONFIRMED: { label: 'Confirmado', icon: CheckCircle, description: 'El negocio confirmó tu compra.' },
  PREPARING: { label: 'Preparando', icon: Package, description: 'Se está preparando el pedido.' },
  READY: { label: 'Listo', icon: CheckCircle, description: 'El pedido está listo para salir.' },
  SHIPPED: { label: 'Enviado', icon: Truck, description: 'El pedido va en camino.' },
  DELIVERED: { label: 'Entregado', icon: CheckCircle, description: 'La entrega fue completada.' },
  CANCELLED: { label: 'Cancelado', icon: AlertCircle, description: 'Este pedido fue cancelado.' },
} as const;

const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera digital',
};

export default function TrackOrderClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { config } = useBusinessConfig();
  const content = getTenantPublicContent(config);
  const { toast } = useToast();
  const router = useRouter();
  const { tenantApiPath, tenantHref } = useTenantPublicRouting();

  const searchOrder = async () => {
    if (!searchTerm.trim()) {
      toast({ title: 'Campo requerido', description: 'Ingresa un número de pedido o email.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      setNotFound(false);
      setOrder(null);
      const params = new URLSearchParams(searchTerm.includes('@') ? { customerEmail: searchTerm } : { orderNumber: searchTerm });
      const response = await fetch(`${tenantApiPath('/api/orders/public/track')}?${params}`);
      if (response.status === 404) { setNotFound(true); return; }
      if (!response.ok) throw new Error('No se pudo consultar el pedido.');
      const data = await response.json();
      if (data.success && data.data.order) setOrder(data.data.order);
      else setNotFound(true);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo buscar el pedido.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
          actions={[{ href: '/orders/track', label: 'Consultar pedido', variant: 'primary' }]}
          metrics={[{ label: 'Canal', value: 'Publico', helpText: 'Disponible desde el subdominio del tenant.' }]}
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

          {notFound ? (
            <Card className="rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Pedido no encontrado</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verifica el número de pedido o el email usado al comprar.</p>
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
                    {order.customer_address ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400 dark:text-slate-500" />{order.customer_address}</p> : null}
                  </div>
                  <div className="space-y-2.5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500" />{PAYMENT_METHODS[order.payment_method] || order.payment_method}</p>
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
                    <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                      <AlertCircle className="h-6 w-6 shrink-0" />
                      <div>
                        <p className="font-semibold">Pedido cancelado</p>
                        <p className="mt-0.5 text-sm text-red-600 dark:text-red-400">Este pedido fue cancelado.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical connector line */}
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
                    <div className="flex justify-between"><span>Envío</span><span>{formatPrice(order.shipping_cost, config)}</span></div>
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
