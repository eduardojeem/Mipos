'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Bell, 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  Mail, 
  Phone,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Activity,
  BarChart3
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// Types
interface Alert {
  id: string;
  type: 'contract_expiry' | 'price_change' | 'payment_due' | 'performance' | 'inventory' | 'compliance' | 'custom';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  supplierId: string;
  supplierName: string;
  category: string;
  triggeredAt: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  metadata?: {
    contractId?: string;
    contractName?: string;
    amount?: number;
    currency?: string;
    threshold?: number;
    currentValue?: number;
    previousValue?: number;
    changePercentage?: number;
    productId?: string;
    productName?: string;
    [key: string]: any;
  };
  actions?: AlertAction[];
  notifications?: AlertNotification[];
  createdAt: string;
  updatedAt: string;
}

interface AlertAction {
  id: string;
  type: 'email' | 'sms' | 'call' | 'task' | 'escalate';
  description: string;
  executedAt?: string;
  executedBy?: string;
  result?: string;
  status: 'pending' | 'completed' | 'failed';
}

interface AlertNotification {
  id: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  recipient: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'failed';
  message: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'contract_expiry' | 'price_change' | 'payment_due' | 'performance' | 'inventory' | 'compliance' | 'custom';
  isActive: boolean;
  conditions: AlertCondition[];
  actions: AlertRuleAction[];
  schedule?: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    days?: string[];
  };
  filters?: {
    supplierIds?: string[];
    categories?: string[];
    tags?: string[];
  };
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between' | 'is_null' | 'is_not_null';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface AlertRuleAction {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'task' | 'escalate';
  recipients: string[];
  template?: string;
  delay?: number; // minutes
}

interface Supplier {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
}

// Mock data
const mockAlertRules: AlertRule[] = [
  {
    id: '1',
    name: 'Vencimiento de Contratos',
    description: 'Alerta cuando un contrato está próximo a vencer',
    type: 'contract_expiry',
    isActive: true,
    conditions: [
      {
        field: 'contract.expiryDate',
        operator: 'less_than',
        value: 30 // días
      }
    ],
    actions: [
      {
        type: 'email',
        recipients: ['admin@empresa.com', 'compras@empresa.com'],
        template: 'contract_expiry'
      }
    ],
    schedule: {
      frequency: 'daily',
      time: '09:00'
    },
    createdBy: 'user1',
    createdByName: 'Juan Pérez',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Cambios de Precio Significativos',
    description: 'Alerta cuando los precios cambian más del umbral establecido',
    type: 'price_change',
    isActive: true,
    conditions: [
      {
        field: 'price.changePercentage',
        operator: 'greater_than',
        value: 10
      }
    ],
    actions: [
      {
        type: 'email',
        recipients: ['compras@empresa.com'],
        template: 'price_change'
      },
      {
        type: 'task',
        recipients: ['user1'],
        template: 'review_price_change'
      }
    ],
    schedule: {
      frequency: 'immediate'
    },
    createdBy: 'user1',
    createdByName: 'Juan Pérez',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

const mockSuppliers: Supplier[] = [
  { id: 'sup1', name: 'TechSupply Corp', category: 'Tecnología', email: 'contact@techsupply.com', phone: '+52 55 1234 5678' },
  { id: 'sup2', name: 'Office Materials Inc', category: 'Oficina', email: 'sales@officematerials.com', phone: '+52 55 2345 6789' },
  { id: 'sup3', name: 'Industrial Supplies', category: 'Materiales', email: 'info@industrialsupplies.com', phone: '+52 55 3456 7890' },
  { id: 'sup4', name: 'Quick Logistics', category: 'Logística', email: 'support@quicklogistics.com', phone: '+52 55 4567 8901' }
];

export default function AlertsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(mockAlertRules);
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Dialog states
  const [showNewAlertDialog, setShowNewAlertDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  
  // Form state
  const [alertFormData, setAlertFormData] = useState<Partial<Alert>>({
    severity: 'medium',
    status: 'active',
    type: 'custom'
  });
  
  const [ruleFormData, setRuleFormData] = useState<Partial<AlertRule>>({
    isActive: true,
    type: 'custom',
    conditions: [],
    actions: [],
    schedule: { frequency: 'immediate' }
  });

  // Load data
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers/alerts');
      setAlerts(response.data.alerts);
      // Rules are still mock for now as backend support is pending
      // setAlertRules(response.data.rules);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar las alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtering and sorting
  const filteredAlerts = alerts
    .filter(alert => {
      const matchesSearch = alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           alert.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || alert.type === filterType;
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
      const matchesSupplier = filterSupplier === 'all' || alert.supplierId === filterSupplier;
      
      return matchesSearch && matchesType && matchesSeverity && matchesStatus && matchesSupplier;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.triggeredAt);
          bValue = new Date(b.triggeredAt);
          break;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aValue = severityOrder[a.severity];
          bValue = severityOrder[b.severity];
          break;
        case 'supplier':
          aValue = a.supplierName;
          bValue = b.supplierName;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        default:
          aValue = new Date(a.triggeredAt);
          bValue = new Date(b.triggeredAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Helper functions
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <Bell className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return (
      <Badge className={variants[severity as keyof typeof variants]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-red-500',
      acknowledged: 'bg-yellow-500',
      resolved: 'bg-green-500',
      dismissed: 'bg-gray-500'
    };
    const labels = {
      active: 'Activa',
      acknowledged: 'Reconocida',
      resolved: 'Resuelta',
      dismissed: 'Descartada'
    };
    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contract_expiry':
        return <FileText className="h-4 w-4" />;
      case 'price_change':
        return <DollarSign className="h-4 w-4" />;
      case 'payment_due':
        return <Calendar className="h-4 w-4" />;
      case 'performance':
        return <BarChart3 className="h-4 w-4" />;
      case 'inventory':
        return <Package className="h-4 w-4" />;
      case 'compliance':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      contract_expiry: 'Vencimiento de Contrato',
      price_change: 'Cambio de Precio',
      payment_due: 'Pago Pendiente',
      performance: 'Rendimiento',
      inventory: 'Inventario',
      compliance: 'Cumplimiento',
      custom: 'Personalizada'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const formatCurrency = (amount: number, currency: string = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Statistics calculations
  const stats = {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter(a => a.status === 'active').length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    acknowledgedAlerts: alerts.filter(a => a.status === 'acknowledged').length,
    resolvedToday: alerts.filter(a => {
      if (!a.resolvedAt) return false;
      const today = new Date().toDateString();
      return new Date(a.resolvedAt).toDateString() === today;
    }).length,
    activeRules: alertRules.filter(r => r.isActive).length
  };

  // Form handlers
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.patch('/suppliers/alerts', { id: alertId, status: 'acknowledged' });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged', assignedTo: user?.id, assignedToName: user?.name }
          : alert
      ));
      
      toast({
        title: 'Alerta reconocida',
        description: 'La alerta ha sido reconocida exitosamente',
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Error al reconocer la alerta',
        variant: 'destructive',
      });
    }
  };

  const handleResolveAlert = async (alertId: string, resolution: string) => {
    try {
      await api.patch('/suppliers/alerts', { 
        id: alertId, 
        status: 'resolved', 
        resolution_notes: resolution 
      });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              status: 'resolved', 
              resolvedBy: user?.id, 
              resolvedByName: user?.name,
              resolvedAt: new Date().toISOString()
            }
          : alert
      ));
      
      toast({
        title: 'Alerta resuelta',
        description: 'La alerta ha sido resuelta exitosamente',
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error',
        description: 'Error al resolver la alerta',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      // In a real app, update via API
      // await api.patch(`/suppliers/alert-rules/${ruleId}`, { isActive });
      
      setAlertRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, isActive } : rule
      ));
      
      toast({
        title: isActive ? 'Regla activada' : 'Regla desactivada',
        description: `La regla ha sido ${isActive ? 'activada' : 'desactivada'} exitosamente`,
      });
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({
        title: 'Error',
        description: 'Error al actualizar la regla',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="ghost" 
          className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Alertas</h1>
          <p className="text-muted-foreground">
            Gestión automática de alertas y notificaciones de proveedores
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configurar Reglas
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewAlertDialog} onOpenChange={setShowNewAlertDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Alerta
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="rules">Reglas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Bell className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalAlerts}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeAlerts}</p>
                    <p className="text-sm text-muted-foreground">Activas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Zap className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.criticalAlerts}</p>
                    <p className="text-sm text-muted-foreground">Críticas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Eye className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.acknowledgedAlerts}</p>
                    <p className="text-sm text-muted-foreground">Reconocidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.resolvedToday}</p>
                    <p className="text-sm text-muted-foreground">Resueltas Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Settings className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeRules}</p>
                    <p className="text-sm text-muted-foreground">Reglas Activas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar alertas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="contract_expiry">Vencimiento Contrato</SelectItem>
                    <SelectItem value="price_change">Cambio Precio</SelectItem>
                    <SelectItem value="payment_due">Pago Pendiente</SelectItem>
                    <SelectItem value="performance">Rendimiento</SelectItem>
                    <SelectItem value="inventory">Inventario</SelectItem>
                    <SelectItem value="compliance">Cumplimiento</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activas</SelectItem>
                    <SelectItem value="acknowledged">Reconocidas</SelectItem>
                    <SelectItem value="resolved">Resueltas</SelectItem>
                    <SelectItem value="dismissed">Descartadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los proveedores</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} className={`${alert.severity === 'critical' ? 'border-red-500' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'high' ? 'bg-orange-100' :
                        alert.severity === 'medium' ? 'bg-yellow-100' :
                        'bg-blue-100'
                      }`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-lg">{alert.title}</h3>
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            {getTypeIcon(alert.type)}
                            <span>{getTypeLabel(alert.type)}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-3">{alert.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{alert.supplierName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                          </div>
                          {alert.dueDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Vence: {new Date(alert.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {alert.assignedToName && (
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4" />
                              <span>Asignada a: {alert.assignedToName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.status === 'active' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Reconocer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id, 'Resuelto manualmente')}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Resolver
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  {alert.metadata && (
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {alert.metadata.contractName && (
                          <div>
                            <span className="text-muted-foreground">Contrato:</span>
                            <p className="font-medium">{alert.metadata.contractName}</p>
                          </div>
                        )}
                        {alert.metadata.amount && (
                          <div>
                            <span className="text-muted-foreground">Monto:</span>
                            <p className="font-medium">{formatCurrency(alert.metadata.amount, alert.metadata.currency)}</p>
                          </div>
                        )}
                        {alert.metadata.changePercentage && (
                          <div>
                            <span className="text-muted-foreground">Cambio:</span>
                            <p className="font-medium flex items-center space-x-1">
                              {alert.metadata.changePercentage > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              )}
                              <span>{Math.abs(alert.metadata.changePercentage)}%</span>
                            </p>
                          </div>
                        )}
                        {alert.metadata.currentValue && alert.metadata.threshold && (
                          <div>
                            <span className="text-muted-foreground">Valor/Umbral:</span>
                            <p className="font-medium">{alert.metadata.currentValue}% / {alert.metadata.threshold}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Alertas</CardTitle>
              <CardDescription>
                Configuración automática de alertas basadas en condiciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge className={rule.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                            {rule.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            {getTypeIcon(rule.type)}
                            <span>{getTypeLabel(rule.type)}</span>
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-2">{rule.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Condiciones: </span>
                            <span>{rule.conditions.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Acciones: </span>
                            <span>{rule.actions.length}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Frecuencia: </span>
                            <span>{rule.schedule?.frequency}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                        />
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {((stats.resolvedToday / (stats.totalAlerts || 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Tasa Resolución Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {alerts.filter(a => a.status === 'active').length > 0 ? 
                        Math.round(alerts.filter(a => a.status === 'active').reduce((sum, a) => {
                          const hours = (new Date().getTime() - new Date(a.triggeredAt).getTime()) / (1000 * 60 * 60);
                          return sum + hours;
                        }, 0) / alerts.filter(a => a.status === 'active').length) : 0
                      }h
                    </p>
                    <p className="text-sm text-muted-foreground">Tiempo Promedio Activa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {((alerts.filter(a => a.status === 'resolved').length / (stats.totalAlerts || 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">Tasa Resolución Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Zap className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {((stats.criticalAlerts / (stats.totalAlerts || 1)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">% Alertas Críticas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl" aria-labelledby="alert-details-title">
          <DialogHeader>
            <DialogTitle id="alert-details-title">Detalles de la Alerta</DialogTitle>
            <DialogDescription>
              Información completa y acciones disponibles
            </DialogDescription>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label>Título</Label>
                  <p className="mt-1 font-medium">{selectedAlert.title}</p>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getTypeIcon(selectedAlert.type)}
                    <span>{getTypeLabel(selectedAlert.type)}</span>
                  </div>
                </div>
                <div>
                  <Label>Severidad</Label>
                  <div className="mt-1">
                    {getSeverityBadge(selectedAlert.severity)}
                  </div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedAlert.status)}
                  </div>
                </div>
                <div>
                  <Label>Proveedor</Label>
                  <p className="mt-1 font-medium">{selectedAlert.supplierName}</p>
                  <p className="text-sm text-muted-foreground">{selectedAlert.category}</p>
                </div>
                <div>
                  <Label>Fecha de Activación</Label>
                  <p className="mt-1">{new Date(selectedAlert.triggeredAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <Label>Descripción</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedAlert.description}</p>
              </div>
              
              {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                <div>
                  <Label>Información Adicional</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(selectedAlert.metadata).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <p className="font-medium">
                            {typeof value === 'number' && key.includes('amount') ? 
                              formatCurrency(value) : 
                              String(value)
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {selectedAlert.assignedToName && (
                <div>
                  <Label>Asignada a</Label>
                  <p className="mt-1">{selectedAlert.assignedToName}</p>
                </div>
              )}
              
              {selectedAlert.resolvedAt && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resuelta por</Label>
                    <p className="mt-1">{selectedAlert.resolvedByName}</p>
                  </div>
                  <div>
                    <Label>Fecha de Resolución</Label>
                    <p className="mt-1">{new Date(selectedAlert.resolvedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
            {selectedAlert?.status === 'active' && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleAcknowledgeAlert(selectedAlert.id);
                    setShowDetailsDialog(false);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Reconocer
                </Button>
                <Button 
                  onClick={() => {
                    handleResolveAlert(selectedAlert.id, 'Resuelto desde detalles');
                    setShowDetailsDialog(false);
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Resolver
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
