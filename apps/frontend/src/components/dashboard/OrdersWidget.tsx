'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

interface OrderStats {
  totalOrders: number;
  recentOrders: number;
  totalRevenue: number;
  recentRevenue: number;
  averageOrderValue: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface OrdersData {
  stats: OrderStats;
  ordersByStatus: Record<string, number>;
  recentOrders: Order[];
}

const ORDER_STATUSES = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  PREPARING: { label: 'Preparando', color: 'bg-orange-100 text-orange-800', icon: Package },
  READY: { label: 'Listo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  SHIPPED: { label: 'Enviado', color: 'bg-purple-100 text-purple-800', icon: Truck },
  DELIVERED: { label: 'Entregado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function OrdersWidget() {
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const { config } = useBusinessConfig();

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas
      const statsResponse = await fetch('/api/orders/stats?period=30');
      const statsData = await statsResponse.json();
      
      // Obtener pedidos recientes
      const ordersResponse = await fetch('/api/orders?limit=5');
      const ordersData = await ordersResponse.json();

      if (statsData.success && ordersData.success) {
        setData({
          stats: statsData.data.stats,
          ordersByStatus: statsData.data.ordersByStatus,
          recentOrders: ordersData.data.orders
        });
      }
    } catch (error) {
      console.error('Error fetching orders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || ORDER_STATUSES.PENDING;
    const Icon = statusInfo.icon;
    
    return (
      <Badge className={`${statusInfo.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No se pudieron cargar los datos de pedidos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pedidos (30d)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.stats.recentOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Ingresos (30d)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(data.stats.recentRevenue, config)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Valor Promedio
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(data.stats.averageOrderValue, config)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Pedidos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.stats.totalOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos por Estado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pedidos por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.ordersByStatus).map(([status, count]) => {
                const statusInfo = ORDER_STATUSES[status as keyof typeof ORDER_STATUSES];
                if (!statusInfo) return null;
                
                const Icon = statusInfo.icon;
                const percentage = data.stats.recentOrders > 0 
                  ? Math.round((count / data.stats.recentOrders) * 100) 
                  : 0;

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {count} ({percentage}%)
                      </span>
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pedidos Recientes
              </div>
              <Link href="/admin/orders">
                <Button variant="outline" size="sm">
                  Ver Todos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No hay pedidos recientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{order.order_number}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {format(new Date(order.created_at), 'PPp', { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">
                        {formatPrice(order.total, config)}
                      </p>
                      <Link href={`/admin/orders`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}