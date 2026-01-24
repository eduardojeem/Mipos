'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Calendar,
  User,
  Mail,
  Phone,
  CreditCard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NavBar } from '@/app/home/components/NavBar';
import { useRouter } from 'next/navigation';

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
  PENDING: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
    description: 'Tu pedido ha sido recibido y está siendo procesado'
  },
  CONFIRMED: {
    label: 'Confirmado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: CheckCircle,
    description: 'Tu pedido ha sido confirmado y está en preparación'
  },
  PREPARING: {
    label: 'Preparando',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: Package,
    description: 'Estamos preparando tu pedido con cuidado'
  },
  READY: {
    label: 'Listo',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
    description: 'Tu pedido está listo para ser enviado'
  },
  SHIPPED: {
    label: 'Enviado',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Truck,
    description: 'Tu pedido está en camino'
  },
  DELIVERED: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
    description: '¡Tu pedido ha sido entregado exitosamente!'
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
    description: 'Este pedido ha sido cancelado'
  },
};

const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera Digital',
};

export default function TrackOrderPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { config } = useBusinessConfig();
  const { toast } = useToast();
  const router = useRouter();

  const searchOrder = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Campo requerido',
        description: 'Por favor ingresa un número de pedido o email',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      setNotFound(false);
      setOrder(null);

      const isEmail = searchTerm.includes('@');
      const params = new URLSearchParams();

      if (isEmail) {
        params.append('customerEmail', searchTerm);
      } else {
        params.append('orderNumber', searchTerm);
      }

      const response = await fetch(`/api/orders/public/track?${params}`);

      if (response.status === 404) {
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        throw new Error('Error al buscar el pedido');
      }

      const data = await response.json();

      if (data.success && data.data.order) {
        setOrder(data.data.order);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error searching order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo buscar el pedido. Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusProgress = (currentStatus: string) => {
    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentStatus === 'CANCELLED' ? -1 : currentIndex;
  };

  const StatusTimeline = ({ order }: { order: Order }) => {
    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'];
    const currentProgress = getStatusProgress(order.status);

    if (currentProgress === -1) {
      return (
        <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-400">Pedido Cancelado</h3>
            <p className="text-sm text-red-600 dark:text-red-500">Este pedido ha sido cancelado</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {statusOrder.map((status, index) => {
          const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
          const Icon = statusInfo.icon;
          const isCompleted = index <= currentProgress;
          const isCurrent = index === currentProgress;

          return (
            <div key={status} className="relative">
              <div className="flex items-start gap-4">
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 border-purple-500 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                  }`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-lg ${isCompleted ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {statusInfo.label}
                    </h3>
                    {isCurrent && (
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                        Actual
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${isCompleted ? 'text-purple-600 dark:text-purple-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {statusInfo.description}
                  </p>
                </div>
              </div>

              {index < statusOrder.length - 1 && (
                <div className={`absolute left-6 top-12 w-0.5 h-6 -ml-px ${isCompleted ? 'bg-gradient-to-b from-purple-500 to-pink-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-950 dark:via-purple-950/40 dark:to-slate-900">
      <NavBar
        config={config}
        activeSection="seguimiento"
        onNavigate={(sectionId) => router.push(`/home#${sectionId}`)}
      />

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header Premium */}
        <div className="text-center mb-12 animate-slide-up">
          <Badge className="badge-hot mb-4">
            📦 Seguimiento en Tiempo Real
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
            Rastrea tu Pedido
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Ingresa tu número de pedido o email para ver el estado actualizado de tu compra
          </p>
        </div>

        {/* Buscador Premium */}
        <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Número de pedido o email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
                  className="pl-12 h-14 text-base border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-purple-500"
                />
              </div>
              <Button
                onClick={searchOrder}
                disabled={loading}
                className="h-14 px-8 btn-premium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* No encontrado */}
        {notFound && (
          <Card className="border-0 shadow-xl animate-slide-up">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Package className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  Pedido no encontrado
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  No pudimos encontrar un pedido con esa información.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Verifica que el número de pedido o email sean correctos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detalles del Pedido */}
        {order && (
          <div className="space-y-6">
            {/* Info General */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-up">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6" />
                    <span className="text-xl">Pedido {order.order_number}</span>
                  </div>
                  <Badge className={`${ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].color} text-base px-4 py-2`}>
                    {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <span className="text-sm">
                        {format(new Date(order.created_at), 'PPP', { locale: es })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-purple-500" />
                      <span className="text-sm font-medium">{order.customer_name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-500" />
                      <span className="text-sm">{order.customer_email}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-purple-500" />
                      <span className="text-sm">{order.customer_phone}</span>
                    </div>

                    {order.customer_address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        <span className="text-sm">{order.customer_address}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-purple-500" />
                      <span className="text-sm">
                        {PAYMENT_METHODS[order.payment_method] || order.payment_method}
                      </span>
                    </div>

                    {order.estimated_delivery_date && (
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-purple-500" />
                        <span className="text-sm">
                          Entrega: {format(new Date(order.estimated_delivery_date), 'PPP', { locale: es })}
                        </span>
                      </div>
                    )}

                    <div className="glass-card p-6 rounded-xl">
                      <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {formatPrice(order.total, config)}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {order.order_items.length} {order.order_items.length === 1 ? 'producto' : 'productos'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-2xl">Estado del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline order={order} />
              </CardContent>
            </Card>

            {/* Productos */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-2xl">Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 glass-card rounded-xl hover:shadow-lg transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white">
                          {item.product_name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatPrice(item.unit_price, config)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-purple-600 dark:text-purple-400">
                          {formatPrice(item.subtotal, config)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{formatPrice(order.subtotal, config)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Envío:</span>
                      <span className="font-semibold">{formatPrice(order.shipping_cost, config)}</span>
                    </div>
                    <div className="flex justify-between font-black text-2xl text-purple-600 dark:text-purple-400 pt-3 border-t">
                      <span>Total:</span>
                      <span>{formatPrice(order.total, config)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.notes && (
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <CardHeader>
                  <CardTitle className="text-2xl">Notas del Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 dark:text-slate-300">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}