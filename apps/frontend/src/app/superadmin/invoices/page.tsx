'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Search,
  Send,
  Wallet,
  X
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/lib/toast';
import { cn, formatDate } from '@/lib/utils';

type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
type ActionType = 'mark-paid' | 'void' | 'send';

interface InvoiceItem {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

interface Invoice {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  overdue: boolean;
  daysOverdue: number;
  dueDate: string;
  paidAt: string | null;
  planName: string;
  billingCycle: string;
  subscriptionStatus: string;
  items: InvoiceItem[];
  pdfUrl: string | null;
  receiptUrl: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  summary: {
    total: number;
    open: number;
    paid: number;
    overdue: number;
    void: number;
    uncollectible: number;
    outstandingAmount: number;
    paidAmount: number;
    overdueAmount: number;
    collectionRate: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const PAGE_SIZE = 20;

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  draft: { label: 'Borrador', variant: 'secondary', className: 'bg-muted/80 text-muted-foreground border border-muted-foreground/10' },
  open: { label: 'Abierta', variant: 'outline', className: 'bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20' },
  paid: { label: 'Pagada', variant: 'outline', className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20' },
  void: { label: 'Anulada', variant: 'outline', className: 'bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20' },
  uncollectible: { label: 'Incobrable', variant: 'outline', className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20' }
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

function safeDate(value?: string | null) {
  return value ? formatDate(value) : 'Sin fecha';
}

function cycleLabel(value: string) {
  return value === 'yearly' ? 'anual' : 'mensual';
}

function actionCopy(type: ActionType, invoice?: Invoice | null) {
  if (type === 'mark-paid') {
    return {
      title: 'Marcar factura como pagada',
      description: `Esto registrara ${invoice?.invoiceNumber} como pagada y actualizara la cartera de cobranza.`,
      button: 'Marcar pagada'
    };
  }

  if (type === 'void') {
    return {
      title: 'Anular factura',
      description: `Esto anulara ${invoice?.invoiceNumber}. No se puede aplicar sobre facturas ya pagadas.`,
      button: 'Anular factura'
    };
  }

  return {
    title: 'Enviar factura',
    description: `Se marcara ${invoice?.invoiceNumber} para envio. Si el proveedor de email no esta configurado, quedara registrada como pendiente.`,
    button: 'Enviar'
  };
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionTarget, setActionTarget] = useState<{ type: ActionType; invoice: Invoice } | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: PAGE_SIZE.toString()
    });

    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);

    return params.toString();
  }, [debouncedSearch, page, statusFilter]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery<InvoicesResponse>({
    queryKey: ['superadmin-invoices', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/superadmin/invoices?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    }
  });

  const runAction = async (target: { type: ActionType; invoice: Invoice }) => {
    const endpoint = target.type === 'mark-paid' ? 'mark-paid' : target.type;
    const response = await fetch(`/api/superadmin/invoices/${target.invoice.id}/${endpoint}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to update invoice');
    return response.json();
  };

  const actionMutation = useMutation({
    mutationFn: runAction,
    onSuccess: (_result, target) => {
      setActionTarget(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin-invoices'] });
      const messages: Record<ActionType, string> = {
        'mark-paid': 'Factura marcada como pagada',
        void: 'Factura anulada',
        send: 'Factura marcada para envio'
      };
      toast({
        title: messages[target.type],
        description: 'La cartera de cobranza fue actualizada.'
      });
    },
    onError: () => {
      toast({
        title: 'No se pudo actualizar la factura',
        description: 'Revisa el estado actual o intenta nuevamente.'
      });
    }
  });

  const invoices = data?.data ?? [];
  const summary = data?.summary ?? {
    total: 0,
    open: 0,
    paid: 0,
    overdue: 0,
    void: 0,
    uncollectible: 0,
    outstandingAmount: 0,
    paidAmount: 0,
    overdueAmount: 0,
    collectionRate: 0
  };
  const pagination = data?.pagination ?? { page, limit: PAGE_SIZE, total: 0, pages: 0 };

  const statusFilters = [
    { value: 'all', label: 'Todas', count: summary.total },
    { value: 'open', label: 'Abiertas', count: summary.open },
    { value: 'overdue', label: 'Vencidas', count: summary.overdue },
    { value: 'paid', label: 'Pagadas', count: summary.paid },
    { value: 'void', label: 'Anuladas', count: summary.void }
  ];

  const summaryCards = [
    {
      label: 'Pendiente de cobro',
      value: formatCurrency(summary.outstandingAmount),
      detail: `${summary.open} abiertas`,
      icon: Wallet,
      tone: 'text-sky-600'
    },
    {
      label: 'Vencidas',
      value: formatCurrency(summary.overdueAmount),
      detail: `${summary.overdue} requieren seguimiento`,
      icon: AlertTriangle,
      tone: 'text-amber-600'
    },
    {
      label: 'Cobrado',
      value: formatCurrency(summary.paidAmount),
      detail: `${summary.collectionRate}% tasa de cobranza`,
      icon: CheckCircle2,
      tone: 'text-emerald-600'
    },
    {
      label: 'Total facturas',
      value: summary.total.toString(),
      detail: `${summary.void} anuladas`,
      icon: FileText,
      tone: 'text-muted-foreground'
    }
  ];

  const currentAction = actionTarget ? actionCopy(actionTarget.type, actionTarget.invoice) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Receipt className="h-3.5 w-3.5" />
            <span className="tracking-wide">Facturación & Cobranza</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">Facturas SaaS</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Control de cobranza para planes MITIENDA: vencimientos, pagos, anulaciones y seguimiento por organización.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full gap-2 sm:w-auto h-10 bg-background/50 border-border/50 hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-2xl glass-card hover-lift hover-glow border-border/50 bg-background/60 backdrop-blur-sm transition-all duration-300">
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">{card.label}</div>
                  <div className="mt-3 truncate text-2xl font-extrabold text-foreground">{card.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground/80">{card.detail}</div>
                </div>
                <div className={cn('rounded-xl bg-background/40 p-2.5 border border-border/40 shadow-sm backdrop-blur-sm', card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar factura u organización"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              className="w-full xl:w-auto"
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 xl:w-auto bg-background/50 border border-border/50">
                {statusFilters.map((filter) => (
                  <TabsTrigger key={filter.value} value={filter.value} className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    {filter.label}
                    <span className="rounded bg-background/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {filter.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudieron cargar las facturas</AlertTitle>
          <AlertDescription>
            La seccion ahora usa `/api/superadmin/invoices`. Revisa que la tabla `invoices` exista y tenga permisos de service role.
          </AlertDescription>
        </Alert>
      ) : null}      <Card className="rounded-2xl border-border/50 bg-background/60 backdrop-blur-sm glass-card">
        <CardHeader className="flex flex-col gap-2 border-b border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-bold">Cartera de cobranza</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {pagination.total} resultado{pagination.total === 1 ? '' : 's'} · página {Math.max(pagination.page, 1)} de {Math.max(pagination.pages, 1)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="min-w-[160px] pl-6">Factura</TableHead>
                  <TableHead className="min-w-[240px]">Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="w-[64px] text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index} className="border-b border-border/50">
                      <TableCell colSpan={8} className="py-4 px-6">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableCell colSpan={8} className="h-36 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 text-muted-foreground/60" />
                        <div className="font-medium text-foreground">Sin facturas para este filtro</div>
                        <div className="text-sm">Ajusta la búsqueda o cambia el estado seleccionado.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const config = statusConfig[invoice.status];
 
                    return (
                      <TableRow key={invoice.id} className={cn('border-b border-border/50 transition-colors', invoice.overdue ? 'bg-amber-500/5 dark:bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-muted/40')}>
                        <TableCell className="pl-6 py-4">
                          <div className="font-mono text-sm font-semibold text-foreground">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground/80 mt-0.5">{safeDate(invoice.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{invoice.organizationName}</div>
                            <div className="text-xs text-muted-foreground">{invoice.organizationSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{invoice.planName}</div>
                            <div className="text-xs text-muted-foreground">{cycleLabel(invoice.billingCycle)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={config.variant} className={config.className}>
                              {config.label}
                            </Badge>
                            {invoice.overdue ? <div className="text-xs font-medium text-amber-700">Vencida</div> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn('flex items-start gap-2 text-sm', invoice.overdue && 'font-semibold text-amber-600 dark:text-amber-500')}>
                            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <div>{safeDate(invoice.dueDate)}</div>
                              {invoice.overdue ? (
                                <div className="text-[10px] uppercase font-bold tracking-wider">{invoice.daysOverdue} día{invoice.daysOverdue === 1 ? '' : 's'} de atraso</div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.paidAt ? (
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-500">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              {safeDate(invoice.paidAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Pendiente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Abrir acciones" className="hover:bg-muted/60">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-border/50 glass-card">
                              <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)} className="focus:bg-muted/60">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => invoice.pdfUrl && window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer')}
                                disabled={!invoice.pdfUrl}
                                className="focus:bg-muted/60"
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border/50" />
                              {invoice.status === 'open' || invoice.status === 'draft' ? (
                                <DropdownMenuItem onClick={() => setActionTarget({ type: 'mark-paid', invoice })} className="focus:bg-emerald-500/10 focus:text-emerald-500">
                                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                  Marcar pagada
                                </DropdownMenuItem>
                              ) : null}
                              {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                                <DropdownMenuItem onClick={() => setActionTarget({ type: 'send', invoice })} className="focus:bg-muted/60">
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar
                                </DropdownMenuItem>
                              ) : null}
                              {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                                <DropdownMenuItem
                                  onClick={() => setActionTarget({ type: 'void', invoice })}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Anular
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
 
          <div className="flex flex-col gap-3 border-t border-border/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Mostrando {invoices.length} de {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page <= 1 || isFetching}
                className="h-8 bg-background/50 border-border/50 hover:bg-muted/50"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, Math.max(pagination.pages, 1)))}
                disabled={pagination.page >= pagination.pages || pagination.pages === 0 || isFetching}
                className="h-8 bg-background/50 border-border/50 hover:bg-muted/50"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl border-border/50 glass-card">
          <DialogHeader>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary w-fit">
              <Receipt className="h-3.5 w-3.5" />
              <span>Detalle de Factura</span>
            </div>
            <DialogTitle className="text-2xl font-bold mt-2">{selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.organizationName} · {selectedInvoice?.planName}
            </DialogDescription>
          </DialogHeader>
 
          {selectedInvoice ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monto</div>
                  <div className="mt-1 text-lg font-bold text-foreground">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vencimiento</div>
                  <div className="mt-1 text-base font-semibold">{safeDate(selectedInvoice.dueDate)}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pago</div>
                  <div className="mt-1 text-base font-semibold">{safeDate(selectedInvoice.paidAt)}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40 p-4 backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Último envío</div>
                  <div className="mt-1 text-base font-semibold">{safeDate(selectedInvoice.lastSentAt)}</div>
                </div>
              </div>
 
              <div className="rounded-2xl border border-border/50 bg-background/60 p-5 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ítems Detallados</div>
                  {selectedInvoice.pdfUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedInvoice.pdfUrl!, '_blank', 'noopener,noreferrer')}
                      className="h-8 gap-2 bg-background/50 border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  )}
                </div>
                {selectedInvoice.items.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {selectedInvoice.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div>
                          <div className="font-medium text-sm text-foreground">{item.description || `Item ${index + 1}`}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {item.quantity ?? 1} x {formatCurrency(item.unitPrice ?? item.amount ?? 0, selectedInvoice.currency)}
                          </div>
                        </div>
                        <div className="font-semibold text-sm text-foreground">{formatCurrency(item.amount ?? 0, selectedInvoice.currency)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground py-2">
                    Esta factura no tiene items detallados en la tabla `invoices`.
                  </div>
                )}
              </div>
            </div>
          ) : null}
 
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <AlertDialogContent className="border-border/50 glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{currentAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{currentAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending} className="border-border/50 bg-background/50 hover:bg-muted/50">Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && actionMutation.mutate(actionTarget)}
              disabled={actionMutation.isPending}
              className={actionTarget?.type === 'void' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm' : 'shadow-sm'}
            >
              {actionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {currentAction?.button}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
