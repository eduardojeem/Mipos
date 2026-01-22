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
  AlertCircle
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderStatusHistory {
  id: string;
  status: string;
  notes?: string;
  changed_at: string;
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
  payment_status: string;
  status: string;
  notes?: string;
  created_at: string;
  estimated_delivery_date?: string;
  order_items: OrderItem[];
  order_status_history: OrderStatusHistory[];
}

const ORDER_STATUSES = {
  PENDING: { 
    label: 'Pendiente', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    icon: Clock,
    description: 'Tu pedido ha sido recibido y está siendo procesado'
  },
  CONFIRMED: { 
    label: 'Confirmado', 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    icon: CheckCircle,
    description: 'Tu pedido ha sido confirmado y está en preparación'
  },
  PREPARING: { 
    label: 'Preparando', 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    icon: Package,
    description: 'Estamos preparando tu pedido con mucho cuidado'
  },
  READY: { 
    label: 'Listo', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    description: 'Tu pedido está listo para ser enviado'
  },
  SHIPPED: { 
    label: 'Enviado', 
    color: 'bg-purple-100 text-purple-800 border-purple-200', 
    icon: Truck,
    description: 'Tu pedido está en camino'
  },
  DELIVERED: { 
    label: 'Entregado', 
    color: 'bg-green-100 text-green-800 border-green-200', 
    icon: CheckCircle,
    description: '¡Tu pedido ha sido entregado exitosamente!'
  },
  CANCELLED: { 
    label: 'Cancelado', 
    color: 'bg-red-100 text-red-800 border-red-200', 
    icon: AlertCircle,
    description: 'Este pedido ha sido cancelado'
  },
};

const PAYMENT_METHODS = {
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

      // Determinar si es número de pedido o email
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
    
    if (currentStatus === 'CANCELLED') {
      return -1; // Estado especial para cancelado
    }
    
    return currentIndex;
  };

  const StatusTimeline = ({ order }: { order: Order }) => {
    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'];
    const currentProgress = getStatusProgress(order.status);
    
    if (currentProgress === -1) {
      // Mostrar solo el estado cancelado
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Pedido Cancelado</h3>
              <p className="text-sm text-red-600">Este pedido ha sido cancelado</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {statusOrder.map((status, index) => {
          const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
          const Icon = statusInfo.icon;
          const isCompleted = index <= currentProgress;
          const isCurrent = index === currentProgress;
          
          return (
            <div key={status} className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${isCompleted ? 'text-green-800' : 'text-gray-500'}`}>
                    {statusInfo.label}
                  </h3>
                  {isCurrent && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      Actual
                    </Badge>
                  )}
                </div>
                <p className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  {statusInfo.description}
                </p>
              </div>
              
              {index < statusOrder.length - 1 && (
                <div className={`w-px h-8 ml-5 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Seguimiento de Pedido
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Ingresa tu número de pedido o email para ver el estado de tu compra
        </p>
      </div>

      {/* Buscador */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Número de pedido (ej: ORD-2024-001-1234) o email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchOrder()}
                  className="pl-12 h-12"
                />
              </div>
            </div>
            <Button 
              onClick={searchOrder} 
              disabled={loading}
              className="h-12 px-8"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estado: No encontrado */}
      {notFound && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Pedido no encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No pudimos encontrar un pedido con esa información.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Verifica que el número de pedido o email sean correctos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalles del Pedido */}
      {order && (
        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Pedido {order.order_number}
                </div>
                <Badge className={ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].color}>
                  {ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES].label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Pedido realizado: {format(new Date(order.created_at), 'PPP', { locale: es })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{order.customer_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{order.customer_email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{order.customer_phone}</span>
                  </div>
                  
                  {order.customer_address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{order.customer_address}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Pago: {PAYMENT_METHODS[order.payment_method as keyof typeof PAYMENT_METHODS]}
                    </span>
                  </div>
                  
                  {order.estimated_delivery_date && (
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        Entrega estimada: {format(new Date(order.estimated_delivery_date), 'PPP', { locale: es })}
                      </span>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatPrice(order.total, config)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {order.order_items.length} {order.order_items.length === 1 ? 'producto' : 'productos'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline de Estado */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline order={order} />
            </CardContent>
          </Card>

          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle>Productos del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.product_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPrice(item.unit_price, config)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {formatPrice(item.subtotal, config)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Totales */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatPrice(order.subtotal, config)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Envío:</span>
                    <span>{formatPrice(order.shipping_cost, config)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatPrice(order.total, config)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas adicionales */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}