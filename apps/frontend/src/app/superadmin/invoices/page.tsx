'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { 
  FileText, 
  Search, 
  MoreVertical, 
  Check, 
  X,
  Send,
  Download,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';

interface Invoice {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: string;
  paidAt?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  createdAt: string;
}

interface InvoiceStats {
  total_invoices: number;
  open_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  outstanding_amount: number;
  paid_amount: number;
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await fetch(`/api/invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    }
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const response = await fetch('/api/invoices/stats/summary');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const json = await response.json();
      return json.data as InvoiceStats;
    }
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to mark invoice as paid');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast({
        title: 'Factura marcada como pagada',
        description: 'La factura se actualizó exitosamente'
      });
    }
  });

  // Void invoice mutation
  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}/void`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to void invoice');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });
      toast({
        title: 'Factura anulada',
        description: 'La factura se anuló exitosamente'
      });
    }
  });

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to send invoice');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Factura enviada',
        description: 'La factura se envió por email exitosamente'
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Borrador' },
      open: { variant: 'default', label: 'Abierta' },
      paid: { variant: 'default', label: 'Pagada' },
      void: { variant: 'outline', label: 'Anulada' },
      uncollectible: { variant: 'destructive', label: 'Incobrable' }
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency
    }).format(price);
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'open' && new Date(dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturas</h1>
          <p className="text-muted-foreground">
            Gestiona las facturas del sistema
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_invoices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.paid_invoices} pagadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open_invoices}</div>
              <p className="text-xs text-muted-foreground">
                {formatPrice(stats.outstanding_amount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue_invoices}</div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(stats.paid_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Facturas pagadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número o organización..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="open">Abiertas</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="void">Anuladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Facturas</CardTitle>
          <CardDescription>
            {data?.pagination?.total || 0} facturas en total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Organización</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Pagada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((invoice: Invoice) => (
                  <TableRow key={invoice.id} className={isOverdue(invoice.dueDate, invoice.status) ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.organizationName}</div>
                        <div className="text-sm text-muted-foreground">{invoice.organizationSlug}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(invoice.amount, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(invoice.status)}
                        {isOverdue(invoice.dueDate, invoice.status) && (
                          <div className="text-xs text-red-600 font-medium">
                            Vencida
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600 font-medium' : ''}>
                        {formatDate(invoice.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.paidAt ? (
                        <div className="text-sm">
                          <Check className="inline h-4 w-4 text-green-600 mr-1" />
                          {formatDate(invoice.paidAt)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invoice.status === 'open' && (
                            <>
                              <DropdownMenuItem onClick={() => markPaidMutation.mutate(invoice.id)}>
                                <Check className="mr-2 h-4 w-4 text-green-600" />
                                Marcar como Pagada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sendMutation.mutate(invoice.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Enviar por Email
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF
                          </DropdownMenuItem>
                          {invoice.status !== 'void' && invoice.status !== 'paid' && (
                            <DropdownMenuItem 
                              onClick={() => voidMutation.mutate(invoice.id)}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Anular
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
