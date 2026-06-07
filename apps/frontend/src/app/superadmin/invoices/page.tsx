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
  draft: { label: 'Borrador', variant: 'secondary' },
  open: { label: 'Abierta', variant: 'default', className: 'bg-sky-600 hover:bg-sky-600' },
  paid: { label: 'Pagada', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
  void: { label: 'Anulada', variant: 'outline' },
  uncollectible: { label: 'Incobrable', variant: 'destructive' }
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Facturas SaaS</h1>
            {isFetching && !isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Control de cobranza para planes MiPOS: vencimientos, pagos, anulaciones y seguimiento por organización.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="w-full gap-2 sm:w-auto">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="rounded-lg">
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{card.label}</div>
                  <div className="mt-2 truncate text-2xl font-semibold">{card.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{card.detail}</div>
                </div>
                <div className={cn('rounded-md bg-muted p-2', card.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg">
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
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 xl:w-auto">
                {statusFilters.map((filter) => (
                  <TabsTrigger key={filter.value} value={filter.value} className="gap-2">
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
      ) : null}

      <Card className="rounded-lg">
        <CardHeader className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Cartera de cobranza</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {pagination.total} resultado{pagination.total === 1 ? '' : 's'} · pagina {Math.max(pagination.page, 1)} de {Math.max(pagination.pages, 1)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Factura</TableHead>
                  <TableHead className="min-w-[240px]">Organizacion</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="w-[64px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-36 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8" />
                        <div className="font-medium text-foreground">Sin facturas para este filtro</div>
                        <div className="text-sm">Ajusta la búsqueda o cambia el estado seleccionado.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const config = statusConfig[invoice.status];

                    return (
                      <TableRow key={invoice.id} className={invoice.overdue ? 'bg-amber-50/50 dark:bg-amber-950/10' : undefined}>
                        <TableCell>
                          <div className="font-mono text-sm font-medium">{invoice.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground">{safeDate(invoice.createdAt)}</div>
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
                          <div className={cn('flex items-start gap-2 text-sm', invoice.overdue && 'font-medium text-amber-700')}>
                            <Clock className="mt-0.5 h-4 w-4" />
                            <div>
                              <div>{safeDate(invoice.dueDate)}</div>
                              {invoice.overdue ? (
                                <div className="text-xs">{invoice.daysOverdue} dia{invoice.daysOverdue === 1 ? '' : 's'} de atraso</div>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.paidAt ? (
                            <div className="flex items-center gap-1 text-sm text-emerald-700">
                              <Check className="h-4 w-4" />
                              {safeDate(invoice.paidAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Pendiente</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Abrir acciones">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => invoice.pdfUrl && window.open(invoice.pdfUrl, '_blank', 'noopener,noreferrer')}
                                disabled={!invoice.pdfUrl}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {invoice.status === 'open' || invoice.status === 'draft' ? (
                                <DropdownMenuItem onClick={() => setActionTarget({ type: 'mark-paid', invoice })}>
                                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                                  Marcar pagada
                                </DropdownMenuItem>
                              ) : null}
                              {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                                <DropdownMenuItem onClick={() => setActionTarget({ type: 'send', invoice })}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Enviar
                                </DropdownMenuItem>
                              ) : null}
                              {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                                <DropdownMenuItem
                                  onClick={() => setActionTarget({ type: 'void', invoice })}
                                  className="text-destructive focus:text-destructive"
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

          <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {invoices.length} de {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={pagination.page <= 1 || isFetching}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(current + 1, Math.max(pagination.pages, 1)))}
                disabled={pagination.page >= pagination.pages || pagination.pages === 0 || isFetching}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.organizationName} · {selectedInvoice?.planName}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Monto</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Vencimiento</div>
                  <div className="mt-1 text-lg font-semibold">{safeDate(selectedInvoice.dueDate)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Pago</div>
                  <div className="mt-1 text-lg font-semibold">{safeDate(selectedInvoice.paidAt)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Ultimo envio</div>
                  <div className="mt-1 text-lg font-semibold">{safeDate(selectedInvoice.lastSentAt)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Items</div>
                {selectedInvoice.items.length > 0 ? (
                  <div className="rounded-lg border">
                    {selectedInvoice.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                        <div>
                          <div className="font-medium">{item.description || `Item ${index + 1}`}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity ?? 1} x {formatCurrency(item.unitPrice ?? item.amount ?? 0, selectedInvoice.currency)}
                          </div>
                        </div>
                        <div className="font-medium">{formatCurrency(item.amount ?? 0, selectedInvoice.currency)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Esta factura no tiene items detallados en la tabla `invoices`.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(actionTarget)} onOpenChange={(open) => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{currentAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && actionMutation.mutate(actionTarget)}
              disabled={actionMutation.isPending}
              className={actionTarget?.type === 'void' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
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
