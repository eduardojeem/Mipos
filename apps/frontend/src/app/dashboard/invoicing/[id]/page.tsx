'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { usePosInvoice, useUpdatePosInvoice } from '@/hooks/usePosInvoices';
import { mapInvoiceToEditorInitial, PosInvoiceEditor } from '../components/PosInvoiceEditor';

export default function InvoiceDetailPage() {
  const organizationId = useCurrentOrganizationId();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const invoiceId = String(params?.id || '').trim();
  const invoiceQuery = usePosInvoice(invoiceId || null);
  const updateMutation = useUpdatePosInvoice();

  if (!organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Factura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Selecciona una organización para ver facturas.</div>
        </CardContent>
      </Card>
    );
  }

  if (invoiceQuery.isLoading) {
    return <div className="h-80 animate-pulse rounded-lg bg-muted" />;
  }

  if (invoiceQuery.error) {
    const message = invoiceQuery.error instanceof Error ? invoiceQuery.error.message : 'No se pudo cargar la factura';
    return (
      <Card>
        <CardHeader>
          <CardTitle>Factura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">{message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!invoiceQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Factura no encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/invoicing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const invoice = invoiceQuery.data;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Factura {invoice.invoiceNumber}</h1>
          <div className="text-sm text-muted-foreground">Edita el borrador o actualiza el estado.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/invoicing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => invoiceQuery.refetch()}
            disabled={invoiceQuery.isFetching}
          >
            Actualizar
          </Button>
        </div>
      </div>

      <PosInvoiceEditor
        initial={mapInvoiceToEditorInitial(invoice)}
        isSaving={updateMutation.isPending}
        onSave={async (payload) => {
          await updateMutation.mutateAsync({ id: invoiceId, ...payload });
          toast({ title: 'Factura actualizada', description: 'Los cambios se guardaron correctamente.' });
          router.refresh();
        }}
      />
    </div>
  );
}

