'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity,
  ShoppingCart,
  Users,
  Settings,
  FileText,
  DollarSign,
  Package,
  UserPlus,
  Edit3,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/lib/toast';

interface ActivityItem {
  id: string;
  type: 'sale' | 'customer' | 'product' | 'user' | 'system' | 'report' | 'setting';
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'login' | 'logout';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    amount?: number;
    quantity?: number;
    customerName?: string;
    productName?: string;
    userName?: string;
    location?: string;
    device?: string;
    ip?: string;
  };
  status: 'success' | 'warning' | 'error' | 'info';
  priority: 'high' | 'medium' | 'low';
}

interface RecentActivityProps {
  initialData?: ActivityItem[];
  onLoadMore?: () => Promise<ActivityItem[]>;
  isLoading?: boolean;
  showFilters?: boolean;
  maxItems?: number;
}

const generateMockActivity = (): ActivityItem[] => {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'sale',
      action: 'create',
      title: 'Nueva venta procesada',
      description: 'Venta #VT-2024-001 por $125.50 completada exitosamente',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
      metadata: { amount: 125.50, customerName: 'María González' },
      status: 'success',
      priority: 'medium'
    },
    {
      id: '2',
      type: 'customer',
      action: 'create',
      title: 'Nuevo cliente registrado',
      description: 'Cliente Juan Pérez agregado al sistema',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
      metadata: { customerName: 'Juan Pérez' },
      status: 'success',
      priority: 'low'
    },
    {
      id: '3',
      type: 'product',
      action: 'update',
      title: 'Inventario actualizado',
      description: 'Stock de "Laptop Dell XPS 13" actualizado: 15 unidades',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      metadata: { productName: 'Laptop Dell XPS 13', quantity: 15 },
      status: 'info',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'system',
      action: 'login',
      title: 'Inicio de sesión',
      description: 'Acceso desde dispositivo móvil',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
      metadata: { device: 'iPhone 14', location: 'Ciudad de México', ip: '192.168.1.100' },
      status: 'info',
      priority: 'low'
    },
    {
      id: '5',
      type: 'report',
      action: 'export',
      title: 'Reporte exportado',
      description: 'Reporte de ventas mensual descargado en formato PDF',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
      status: 'success',
      priority: 'low'
    },
    {
      id: '6',
      type: 'sale',
      action: 'delete',
      title: 'Venta cancelada',
      description: 'Venta #VT-2024-002 cancelada por solicitud del cliente',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
      metadata: { amount: 89.99 },
      status: 'warning',
      priority: 'high'
    },
    {
      id: '7',
      type: 'setting',
      action: 'update',
      title: 'Configuración actualizada',
      description: 'Preferencias de notificaciones modificadas',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      status: 'info',
      priority: 'low'
    },
    {
      id: '8',
      type: 'product',
      action: 'create',
      title: 'Nuevo producto agregado',
      description: 'Producto "Mouse Logitech MX Master 3" añadido al catálogo',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      metadata: { productName: 'Mouse Logitech MX Master 3' },
      status: 'success',
      priority: 'medium'
    }
  ];

  return activities;
};

export function RecentActivity({ 
  initialData, 
  onLoadMore, 
  isLoading = false, 
  showFilters = true,
  maxItems = 50 
}: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialData || generateMockActivity());
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>(activities);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (initialData) {
      setActivities(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    let filtered = activities;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(activity => activity.type === selectedType);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(activity => activity.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(activity => 
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredActivities(filtered.slice(0, maxItems));
  }, [activities, selectedType, selectedStatus, searchQuery, maxItems]);

  const handleLoadMore = async () => {
    if (!onLoadMore) return;
    
    setIsLoadingMore(true);
    try {
      const newActivities = await onLoadMore();
      setActivities(prev => [...prev, ...newActivities]);
      toast.success('Más actividades cargadas');
    } catch (error) {
      toast.error('Error al cargar más actividades');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case 'sale':
        return action === 'delete' ? <XCircle className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />;
      case 'customer':
        return <Users className="h-4 w-4" />;
      case 'product':
        return <Package className="h-4 w-4" />;
      case 'user':
        return <UserPlus className="h-4 w-4" />;
      case 'system':
        return action === 'login' ? <CheckCircle className="h-4 w-4" /> : <Settings className="h-4 w-4" />;
      case 'report':
        return action === 'export' ? <Download className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
      case 'setting':
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();

    if (isToday(date)) {
      return `Hoy ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd MMM yyyy HH:mm', { locale: es });
    }
  };

  const groupActivitiesByDate = (activities: ActivityItem[]) => {
    const groups: { [key: string]: ActivityItem[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Hoy';
      } else if (isYesterday(date)) {
        groupKey = 'Ayer';
      } else {
        groupKey = format(date, 'dd MMMM yyyy', { locale: es });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });
    
    return groups;
  };

  const activityGroups = groupActivitiesByDate(filteredActivities);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-800">Actividad Reciente</CardTitle>
              <CardDescription className="text-gray-600">
                Cargando historial de actividades...
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-800">Actividad Reciente</CardTitle>
              <CardDescription className="text-gray-600">
                Historial de acciones y eventos del sistema
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredActivities.length} actividades
          </Badge>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los tipos</option>
                <option value="sale">Ventas</option>
                <option value="customer">Clientes</option>
                <option value="product">Productos</option>
                <option value="system">Sistema</option>
                <option value="report">Reportes</option>
                <option value="setting">Configuración</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="success">Exitoso</option>
                <option value="warning">Advertencia</option>
                <option value="error">Error</option>
                <option value="info">Información</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar actividades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {Object.entries(activityGroups).map(([dateGroup, groupActivities]) => (
              <div key={dateGroup}>
                <div className="flex items-center space-x-3 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">{dateGroup}</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                  <Badge variant="outline" className="text-xs">
                    {groupActivities.length}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {groupActivities.map((activity, index) => (
                    <div key={activity.id} className="group">
                      <div className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className={`p-2 rounded-lg border ${getActivityColor(activity.status)}`}>
                          {getActivityIcon(activity.type, activity.action)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                {activity.title}
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {activity.description}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Badge 
                                className={`text-xs ${getPriorityColor(activity.priority)}`}
                              >
                                {activity.priority === 'high' && 'Alta'}
                                {activity.priority === 'medium' && 'Media'}
                                {activity.priority === 'low' && 'Baja'}
                              </Badge>
                              <Badge 
                                className={`text-xs ${getStatusBadgeColor(activity.status)}`}
                              >
                                {activity.status === 'success' && 'Exitoso'}
                                {activity.status === 'warning' && 'Advertencia'}
                                {activity.status === 'error' && 'Error'}
                                {activity.status === 'info' && 'Info'}
                              </Badge>
                            </div>
                          </div>

                          {activity.metadata && (
                            <div className="flex flex-wrap gap-3 mb-3">
                              {activity.metadata.amount && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <DollarSign className="h-3 w-3" />
                                  <span>${activity.metadata.amount.toFixed(2)}</span>
                                </div>
                              )}
                              {activity.metadata.quantity && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Package className="h-3 w-3" />
                                  <span>{activity.metadata.quantity} unidades</span>
                                </div>
                              )}
                              {activity.metadata.customerName && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Users className="h-3 w-3" />
                                  <span>{activity.metadata.customerName}</span>
                                </div>
                              )}
                              {activity.metadata.productName && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Package className="h-3 w-3" />
                                  <span>{activity.metadata.productName}</span>
                                </div>
                              )}
                              {activity.metadata.device && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Settings className="h-3 w-3" />
                                  <span>{activity.metadata.device}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatActivityTime(activity.timestamp)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No hay actividades
                </h3>
                <p className="text-gray-600 mb-4">
                  No se encontraron actividades que coincidan con los filtros seleccionados.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedType('all');
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              </div>
            )}

            {onLoadMore && filteredActivities.length > 0 && (
              <div className="text-center pt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  {isLoadingMore ? 'Cargando...' : 'Cargar más actividades'}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}