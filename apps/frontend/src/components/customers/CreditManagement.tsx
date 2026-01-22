'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CustomerCredit {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  description: string;
  createdAt: string;
  updatedAt: string;
  payments: CreditPayment[];
}

interface CreditPayment {
  id: string;
  creditId: string;
  amount: number;
  paymentDate: string;
  notes: string;
  createdBy: string;
  user: {
    name: string;
  };
}

interface CreditAnalytics {
  totalCredits: number;
  pendingCredits: number;
  overdueCredits: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  topDebtors: Array<{
    customerId: string;
    customerName: string;
    totalDebt: number;
    creditCount: number;
  }>;
}

export default function CreditManagement() {
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [analytics, setAnalytics] = useState<CreditAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);

  // Form states
  const [newCredit, setNewCredit] = useState({
    customerId: '',
    totalAmount: '',
    dueDate: '',
    description: ''
  });

  const [newPayment, setNewPayment] = useState({
    amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchCredits();
    fetchAnalytics();
  }, []);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credits');
      
      if (!response.ok) {
        throw new Error('Error al cargar créditos');
      }
      
      const data = await response.json();
      setCredits(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/credits/analytics');
      
      if (!response.ok) {
        throw new Error('Error al cargar analytics de crédito');
      }
      
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      console.error('Error fetching credit analytics:', err);
    }
  };

  const createCredit = async () => {
    try {
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: newCredit.customerId,
          totalAmount: parseFloat(newCredit.totalAmount),
          dueDate: newCredit.dueDate,
          description: newCredit.description
        }),
      });

      if (!response.ok) {
        throw new Error('Error al crear crédito');
      }

      await fetchCredits();
      await fetchAnalytics();
      setShowCreateDialog(false);
      setNewCredit({ customerId: '', totalAmount: '', dueDate: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear crédito');
    }
  };

  const processPayment = async () => {
    if (!selectedCredit) return;

    try {
      const response = await fetch(`/api/credits/${selectedCredit.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          notes: newPayment.notes
        }),
      });

      if (!response.ok) {
        throw new Error('Error al procesar pago');
      }

      await fetchCredits();
      await fetchAnalytics();
      setShowPaymentDialog(false);
      setSelectedCredit(null);
      setNewPayment({ amount: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar pago');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
      PARTIAL: { label: 'Parcial', variant: 'default' as const, icon: CreditCard },
      PAID: { label: 'Pagado', variant: 'default' as const, icon: CheckCircle },
      OVERDUE: { label: 'Vencido', variant: 'destructive' as const, icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         credit.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => { fetchCredits(); fetchAnalytics(); }}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Crédito</h2>
          <p className="text-muted-foreground">Administra los créditos de tus clientes</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Crédito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Crédito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerId">Cliente</Label>
                <Input
                  id="customerId"
                  placeholder="ID del cliente"
                  value={newCredit.customerId}
                  onChange={(e) => setNewCredit({ ...newCredit, customerId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">Monto Total</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newCredit.totalAmount}
                  onChange={(e) => setNewCredit({ ...newCredit, totalAmount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newCredit.dueDate}
                  onChange={(e) => setNewCredit({ ...newCredit, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del crédito"
                  value={newCredit.description}
                  onChange={(e) => setNewCredit({ ...newCredit, description: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createCredit}>
                  Crear Crédito
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Créditos</p>
                  <p className="text-2xl font-bold">{analytics.totalCredits}</p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold">{analytics.pendingCredits}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vencidos</p>
                  <p className="text-2xl font-bold">{analytics.overdueCredits}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.remainingAmount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="PARTIAL">Parcial</SelectItem>
            <SelectItem value="PAID">Pagado</SelectItem>
            <SelectItem value="OVERDUE">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Credits List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCredits.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{credit.customer.name}</p>
                    <p className="text-sm text-gray-500">{credit.customer.email}</p>
                    <p className="text-xs text-gray-400">{credit.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(credit.totalAmount)}</p>
                    <p className="text-sm text-gray-500">
                      Pagado: {formatCurrency(credit.paidAmount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Restante: {formatCurrency(credit.remainingAmount)}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    {getStatusBadge(credit.status)}
                    <p className="text-xs text-gray-500 mt-1">
                      Vence: {formatDate(credit.dueDate)}
                    </p>
                  </div>
                  
                  {credit.status !== 'PAID' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCredit(credit);
                        setShowPaymentDialog(true);
                      }}
                    >
                      Pagar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedCredit.customer.name}</p>
                <p className="text-sm text-gray-600">
                  Monto pendiente: {formatCurrency(selectedCredit.remainingAmount)}
                </p>
              </div>
              
              <div>
                <Label htmlFor="paymentAmount">Monto del Pago</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="paymentNotes">Notas (opcional)</Label>
                <Textarea
                  id="paymentNotes"
                  placeholder="Notas del pago"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={processPayment}>
                  Procesar Pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Top Debtors */}
      {analytics && analytics.topDebtors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Principales Deudores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topDebtors.map((debtor, index) => (
                <div key={debtor.customerId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{debtor.customerName}</p>
                      <p className="text-sm text-gray-500">
                        {debtor.creditCount} crédito{debtor.creditCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{formatCurrency(debtor.totalDebt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}