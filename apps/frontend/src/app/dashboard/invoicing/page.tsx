'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Filter, Plus, Receipt, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Pagination, PaginationInfo, PageSizeSelector } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import {
  usePosInvoiceList,
  usePosInvoice,
  useCreatePosInvoice,
  useUpdatePosInvoice,
  useSeedPosInvoices,
  type PosInvoiceStatus,
} from '@/hooks/usePosInvoices';
import { PosInvoicesTable } from './components/PosInvoicesTable';
import { PosInvoiceEditor, mapInvoiceToEditorInitial } from './components/PosInvoiceEditor';

export default function InvoicingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const organizationId = useCurrentOrganizationId();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState<PosInvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const params = useMemo(
    () => ({
      page,
      limit,
      status: status === 'all' ? undefined : status,
      search: debouncedSearch,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [page, limit, status, debouncedSearch, fromDate, toDate]
  );

  const listQuery = usePosInvoiceList(params);
  const createMutation = useCreatePosInvoice();
  const updateMutation = useUpdatePosInvoice();
  const seedMutation = useSeedPosInvoices();
  const detailQuery = usePosInvoice(selectedInvoiceId);
  const invoices = listQuery.data?.invoices || [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-muted/10 min-h-[400px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
          <Receipt className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Módulo de Facturación</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Para comenzar a visualizar, emitir o administrar facturas, por favor selecciona una organización activa en tu entorno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
            <p className="text-sm text-muted-foreground">Emite, gestiona y haz seguimiento a comprobantes.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="shadow-sm"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 shadow-sm"
            onClick={() => setIsNewOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-4 p-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Estado</Label>
            <Select value={status} onValueChange={(v) => {
              setStatus(v as any);
              setPage(1);
            }}>
              <SelectTrigger className="focus-visible:ring-primary/50">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="issued">Emitida</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
                <SelectItem value="overdue">Vencida</SelectItem>
                <SelectItem value="void">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Buscar</Label>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Nº factura o cliente..."
              className="focus-visible:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="focus-visible:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="focus-visible:ring-primary/50"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50 shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20 border-b border-border/50">
          <CardTitle className="text-base font-semibold">Listado de Facturas</CardTitle>
          <div className="flex flex-wrap items-center gap-4">
            <PaginationInfo
              currentPage={page}
              itemsPerPage={limit}
              totalItems={pagination?.total || 0}
            />
            <PageSizeSelector
              pageSize={limit}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6">
            <PosInvoicesTable
              invoices={invoices}
              isLoading={listQuery.isLoading}
              error={listQuery.error instanceof Error ? listQuery.error.message : null}
              onView={(id) => setSelectedInvoiceId(id)}
              onNew={() => setIsNewOpen(true)}
              isSeeding={seedMutation.isPending}
              onSeedExampleData={async () => {
                const result = await seedMutation.mutateAsync({ count: 6 });
                if (result.skipped) {
                  toast({
                    title: 'Datos de ejemplo',
                    description: 'Ya existen facturas en esta organización. Ajusta filtros o crea una nueva factura.',
                  });
                } else {
                  toast({
                    title: 'Datos de ejemplo generados',
                    description: `Se crearon ${result.inserted} facturas de ejemplo.`,
                  });
                }
                await listQuery.refetch();
              }}
            />
          </div>
          {pagination && totalPages > 1 && (
            <div className="border-t border-border/50 p-4 bg-muted/10 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / Edit Invoice Sheet */}
      <Sheet open={!!selectedInvoiceId} onOpenChange={(open) => { if (!open) setSelectedInvoiceId(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[90vw] xl:max-w-[80vw] p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="flex flex-row items-center justify-between shrink-0 px-6 py-4 border-b border-border/50 bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">
                  {detailQuery.data ? `Factura ${detailQuery.data.invoiceNumber}` : 'Cargando factura...'}
                </SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Edita los datos o actualiza el estado.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedInvoiceId && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <a href={`/dashboard/invoicing/${encodeURIComponent(selectedInvoiceId)}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir página
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedInvoiceId(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {detailQuery.isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            )}
            {detailQuery.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
                <p className="font-medium text-destructive">Error al cargar la factura</p>
                <p className="mt-1 text-muted-foreground">
                  {detailQuery.error instanceof Error ? detailQuery.error.message : 'Intenta nuevamente.'}
                </p>
              </div>
            )}
            {detailQuery.data && (
              <PosInvoiceEditor
                initial={mapInvoiceToEditorInitial(detailQuery.data)}
                isSaving={updateMutation.isPending}
                onSave={async (payload) => {
                  if (!selectedInvoiceId) return;
                  await updateMutation.mutateAsync({ id: selectedInvoiceId, ...payload });
                  toast({ title: 'Factura actualizada', description: 'Los cambios se guardaron correctamente.' });
                  void listQuery.refetch();
                  void detailQuery.refetch();
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* New Invoice Sheet (slide-over) */}
      <Sheet open={isNewOpen} onOpenChange={setIsNewOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[90vw] xl:max-w-[80vw] p-0 flex flex-col overflow-hidden"
        >
          <SheetHeader className="flex flex-row items-center justify-between shrink-0 px-6 py-4 border-b border-border/50 bg-card">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">Nueva Factura</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Se guardará como borrador al crear.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsNewOpen(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <PosInvoiceEditor
              initial={{ status: 'draft' }}
              isSaving={createMutation.isPending}
              onSave={async (payload) => {
                const result = await createMutation.mutateAsync(payload);
                toast({
                  title: '¡Factura creada!',
                  description: `La factura ${result.invoiceNumber} fue guardada como borrador.`,
                });
                setIsNewOpen(false);
                void listQuery.refetch();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
