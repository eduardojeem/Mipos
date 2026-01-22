"use client";
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Calendar,
  MapPin,
  Phone,
  Mail,
  Tag,
  Star,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
// import { useRealtimeService } from '@/hooks/useRealtimeService';
import { customerService, type UICustomer } from '@/lib/customer-service';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerManagementProps {
  className?: string;
}

interface ComponentCustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  totalLifetimeValue: number;
  averageOrderValue: number;
  churnRate: number;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ className }) => {
  const [customers, setCustomers] = useState<UICustomer[]>([]);
  const [stats, setStats] = useState<ComponentCustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomersThisMonth: 0,
    totalLifetimeValue: 0,
    averageOrderValue: 0,
    churnRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<UICustomer | null>(null);

  // const realtimeService = useRealtimeService();

  // Cargar clientes iniciales
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerService.getAll();
      const list = Array.isArray(response.customers) ? response.customers : [];
      setCustomers(list);

      const totalCustomers = list.length;
      const activeCustomers = list.filter((c: UICustomer) => c.is_active).length;
      const newCustomersThisMonth = list.filter((c: UICustomer) => {
        const created = new Date(c.created_at);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;
      const totalLifetimeValue = list.reduce((sum: number, c: UICustomer) => sum + (c.lifetimeValue || 0), 0);
      const averageOrderValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0;
      const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers) * 100 : 0;

      setStats({
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        totalLifetimeValue,
        averageOrderValue,
        churnRate
      });

      setError(null);
    } catch (err) {
      setError('Error al cargar clientes');
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  // TODO: Implementar suscripción a cambios de clientes cuando exista el método
  // realtimeService.subscribeToCustomersGlobal no está implementado aún.
  // Se puede usar polling o WebSocket manual en el futuro.
  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]); // realtimeService removido de dependencias

  // Obtener todos los segmentos únicos
  const segments = useMemo(() => {
    const list = (Array.isArray(customers) ? customers : []) as any[];
    const uniqueSegments = new Set(list.map(c => c.segment).filter(Boolean));
    return Array.from(uniqueSegments);
  }, [customers]);

  // Obtener todas las etiquetas únicas
  const tags = useMemo(() => {
    const list = (Array.isArray(customers) ? customers : []) as any[];
    const uniqueTags = new Set(list.flatMap(c => c.tags || []));
    return Array.from(uniqueTags);
  }, [customers]);

  // Filtrar y ordenar clientes
  const filteredCustomers = useMemo(() => {
    const list = (Array.isArray(customers) ? customers : []) as any[];
    let filtered = list.filter(customer => {
      const c = customer as any;
      const email = c.email?.toLowerCase() || '';
      const name = c.name?.toLowerCase() || '';
      const phone = c.phone || '';
      const q = searchTerm.toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q) || phone.includes(searchTerm);
      const matchesSegment = segmentFilter === 'all' || c.segment === segmentFilter;
      const matchesTag = tagFilter === 'all' || (c.tags && c.tags.includes(tagFilter));
      
      return matchesSearch && matchesSegment && matchesTag;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a as any).name.localeCompare((b as any).name);
        case 'lifetime_value':
          return ((b as any).lifetime_value || 0) - ((a as any).lifetime_value || 0);
        case 'last_purchase':
          return new Date((b as any).last_purchase_date || 0).getTime() - new Date((a as any).last_purchase_date || 0).getTime();
        case 'created_at':
          return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [customers, searchTerm, segmentFilter, tagFilter, sortBy]);

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'new': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'prospect': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente?')) return;

    try {
      await customerService.delete(customerId);
      toast.success('Cliente eliminado correctamente');
      await loadCustomers();
    } catch (error) {
      toast.error('Error al eliminar cliente');
    }
  }, []);

  const handleSaveCustomer = useCallback(async (customerData: Partial<UICustomer>) => {
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, customerData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await customerService.create(customerData);
        toast.success('Cliente creado correctamente');
      }
      
      setShowNewCustomerModal(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (error) {
      toast.error('Error al guardar cliente');
    }
  }, [editingCustomer]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestión Avanzada de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Error de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadCustomers} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCustomers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Nuevos Este Mes</p>
                <p className="text-2xl font-bold text-purple-600">{stats.newCustomersThisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalLifetimeValue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ticket Promedio</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.averageOrderValue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-red-600">{stats.churnRate.toFixed(1)}%</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles y Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Gestión de Clientes
            </span>
            <Button onClick={() => setShowNewCustomerModal(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre, email o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="segment">Segmento</Label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger id="segment">
                  <SelectValue placeholder="Todos los segmentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {segments.map(segment => (
                    <SelectItem key={segment} value={segment}>
                      {segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tag">Etiqueta</Label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger id="tag">
                  <SelectValue placeholder="Todas las etiquetas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort">Ordenar Por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="lifetime_value">Valor Total</SelectItem>
                  <SelectItem value="last_purchase">Última Compra</SelectItem>
                  <SelectItem value="created_at">Fecha de Registro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadCustomers} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Clientes ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={(customer as any).avatar_url} alt={(customer as any).name} />
                      <AvatarFallback>
                        {customer.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{(customer as any).name}</h4>
                        <Badge className={getStatusColor((customer as any).status)}>
                          {(customer as any).status}
                        </Badge>
                        {(customer as any).segment && (
                          <Badge className={getSegmentColor((customer as any).segment)}>
                            {(customer as any).segment}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {(customer as any).email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {(customer as any).phone}
                          </span>
                        </div>
                        
                        {(customer as any).address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {(() => { const addr = (customer as any).address; return typeof addr === 'string' ? addr : `${addr?.city ?? ''}${addr?.state ? ', ' + addr.state : ''}` })()}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Valor: {formatCurrency(((customer as any).lifetime_value || 0) as number)}
                          </span>
                          {(customer as any).last_purchase_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Última: {new Date((customer as any).last_purchase_date).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                        
                        {(customer as any).tags && (customer as any).tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="w-3 h-3" />
                            {(customer as any).tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCustomer(customer)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron clientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Nuevo/Editar Cliente */}
      {(showNewCustomerModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario de cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    defaultValue={editingCustomer?.name || ''}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={editingCustomer?.email || ''}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    defaultValue={editingCustomer?.phone || ''}
                    placeholder="+34 123 456 789"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select defaultValue={editingCustomer?.status || 'active'}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="prospect">Prospecto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => {
                    // Aquí iría la lógica para guardar
                    handleSaveCustomer({});
                  }} 
                  className="flex-1"
                >
                  Guardar
                </Button>
                <Button 
                  onClick={() => {
                    setShowNewCustomerModal(false);
                    setEditingCustomer(null);
                  }} 
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};