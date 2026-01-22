'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  RefreshCw,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  MoreHorizontal,
  ArrowUpDown,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCheck,
  Zap,
  BarChart3,
  DollarSign,
  ShoppingBag,
  Star
} from 'lucide-react';
import { formatPrice } from '@/utils/formatters';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: {
    name: string;
    image_url?: string;
  };
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
  order_source: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  todayRevenue: number;
  avgOrderValue: number;
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

const PAYMENT_METHODS = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  DIGITAL_WALLET: 'Billetera Digital',
};

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState<OrderStats | null>(null);
  const { config } = useBusinessConfig();
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/orders/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('customerEmail', searchTerm);
      }

      const response = await fetch(`/api/orders?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar pedidos');
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.data.orders);
      setTotalPages(data.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los pedidos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, toast]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado');
      }

      toast({
        title: 'Estado actualizado',
        description: 'El estado del pedido se actualizó correctamente',
      });

      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del pedido',
        variant: 'destructive',
      });
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

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length ? [] : orders.map(order => order.id)
    );
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const promises = selectedOrders.map(orderId =>
        fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      await Promise.all(promises);
      
      toast({
        title: 'Estados actualizados',
        description: `${selectedOrders.length} pedidos actualizados correctamente`,
      });

      setSelectedOrders([]);
      fetchOrders();
      fetchStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron actualizar todos los pedidos',
        variant: 'destructive',
      });
    }
  };

  const sortedOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [orders, sortBy, sortOrder]);

  const OrderDetailModal = ({ order }: { order: Order }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Pedido {order.order_number}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {format(new Date(order.created_at), 'PPP', { locale: es })}
              </p>
            </div>
            <Button
              onClick={() => setShowOrderDetail(false)}
              variant="outline"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Información del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_phone}</span>
                </div>
                {order.customer_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{order.customer_address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estado y Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Estado del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Estado:</span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span>Pago:</span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span>{PAYMENT_METHODS[order.payment_method as keyof typeof PAYMENT_METHODS]}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Origen:</span>
                  <Badge variant="outline">{order.order_source}</Badge>
                </div>
                {order.notes && (
                  <div>
                    <span className="font-medium">Notas:</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {order.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productos */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Productos del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPrice(item.unit_price, config)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(item.subtotal, config)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totales */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(order.subtotal, config)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>{formatPrice(order.shipping_cost, config)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(order.total, config)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="mt-6 flex gap-3">
            <Select
              value={order.status}
              onValueChange={(value) => handleStatusChange(order.id, value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                  <SelectItem key={key} value={key}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const StatsCard = ({ title, value, icon: Icon, color, trend }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    trend?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                {title}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {value}
              </p>
              {trend && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  {trend}
                </p>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950/90">
      <div className="container mx-auto p-6 max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Gestión de Pedidos Web
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Administra y monitorea todos los pedidos de tu tienda online
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={fetchOrders} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Pedidos"
              value={stats.total}
              icon={ShoppingBag}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
              trend="Todos los tiempos"
            />
            <StatsCard
              title="Pendientes"
              value={stats.pending}
              icon={Clock}
              color="bg-gradient-to-br from-yellow-500 to-yellow-600"
              trend="Requieren atención"
            />
            <StatsCard
              title="Ingresos Hoy"
              value={formatPrice(stats.todayRevenue, config)}
              icon={DollarSign}
              color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              trend="Pedidos web"
            />
            <StatsCard
              title="Valor Promedio"
              value={formatPrice(stats.avgOrderValue, config)}
              icon={TrendingUp}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              trend="Por pedido"
            />
          </div>
        )}

        {/* Filtros y Controles */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Búsqueda */}
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por número de pedido, cliente o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-700/50"
                  />
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex gap-3 w-full lg:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-white/50 dark:bg-zinc-900/50">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                      <SelectItem key={key} value={key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40 bg-white/50 dark:bg-zinc-900/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="status">Estado</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  variant="outline"
                  size="sm"
                  className="bg-white/50 dark:bg-zinc-900/50"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Acciones en lote */}
            <AnimatePresence>
              {selectedOrders.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedOrders.length} pedidos seleccionados
                    </span>
                    <div className="flex gap-2">
                      <Select onValueChange={handleBulkStatusChange}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Cambiar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                            <SelectItem key={key} value={key}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => setSelectedOrders([])}
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Lista de Pedidos Mejorada */}
        <Card className="border-border/40 dark:border-white/5 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50 backdrop-blur-xl shadow-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Pedidos ({orders.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  {selectedOrders.length === orders.length ? 'Deseleccionar' : 'Seleccionar'} Todo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400">Cargando pedidos...</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No se encontraron pedidos
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  No hay pedidos que coincidan con los filtros actuales
                </p>
                <Button onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }} variant="outline">
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40 dark:divide-white/5">
                <AnimatePresence>
                  {sortedOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => handleSelectOrder(order.id)}
                          className="mt-1"
                        />

                        {/* Contenido Principal */}
                        <div className="flex-1 min-w-0">
                          {/* Header del Pedido */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                                {order.order_number}
                              </h3>
                              {getStatusBadge(order.status)}
                              <Badge variant="outline" className="text-xs">
                                {order.order_source}
                              </Badge>
                              {order.status === 'PENDING' && (
                                <Badge className="bg-red-500 text-white animate-pulse">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Urgente
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-xl text-zinc-900 dark:text-zinc-100">
                                {formatPrice(order.total, config)}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                {order.order_items.length} {order.order_items.length === 1 ? 'producto' : 'productos'}
                              </p>
                            </div>
                          </div>

                          {/* Información del Cliente y Fecha */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                                Cliente
                              </p>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {order.customer_name}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {order.customer_email}
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {order.customer_phone}
                              </p>
                            </div>
                            
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                                Fecha y Pago
                              </p>
                              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                {format(new Date(order.created_at), 'PPp', { locale: es })}
                              </p>
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {PAYMENT_METHODS[order.payment_method as keyof typeof PAYMENT_METHODS]}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                                Dirección
                              </p>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {order.customer_address || 'No especificada'}
                              </p>
                            </div>
                          </div>

                          {/* Productos Preview */}
                          <div className="mb-4">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-2">
                              Productos
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {order.order_items.slice(0, 3).map((item) => (
                                <Badge key={item.id} variant="secondary" className="text-xs">
                                  {item.quantity}× {item.product_name}
                                </Badge>
                              ))}
                              {order.order_items.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{order.order_items.length - 3} más
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderDetail(true);
                                }}
                                variant="outline"
                                size="sm"
                                className="group-hover:border-blue-300 dark:group-hover:border-blue-700"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalles
                              </Button>
                              <Button variant="outline" size="sm">
                                <FileText className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                            </div>

                            <Select
                              value={order.status}
                              onValueChange={(value) => handleStatusChange(order.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ORDER_STATUSES).map(([key, status]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <status.icon className="w-4 h-4" />
                                      {status.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Paginación Mejorada */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-border/40 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Mostrando {((currentPage - 1) * 20) + 1} a {Math.min(currentPage * 20, orders.length)} de {orders.length} pedidos
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && (
                        <>
                          <span className="text-zinc-400">...</span>
                          <Button
                            onClick={() => setCurrentPage(totalPages)}
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalles */}
        {showOrderDetail && selectedOrder && (
          <OrderDetailModal order={selectedOrder} />
        )}
      </div>
    </div>
  );
}