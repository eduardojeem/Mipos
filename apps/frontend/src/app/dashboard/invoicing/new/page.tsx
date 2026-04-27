'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useCurrentOrganizationId } from '@/hooks/use-current-organization';
import { useCreatePosInvoice } from '@/hooks/usePosInvoices';
import { PosInvoiceEditor } from '../components/PosInvoiceEditor';

export default function NewInvoicePage() {
  const organizationId = useCurrentOrganizationId();
  const { toast } = useToast();
  const router = useRouter();
  const createMutation = useCreatePosInvoice();

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-muted/10 min-h-[400px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
          <ArrowLeft className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Módulo de Facturación</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Para comenzar a crear facturas, por favor selecciona una organización activa en tu entorno.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard/invoicing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Facturación
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Nueva Factura</h1>
          <p className="text-sm text-muted-foreground">Crea un borrador de factura y edítalo en cualquier momento antes de su emisión.</p>
        </div>
        <Button asChild variant="outline" className="shadow-sm shrink-0">
          <Link href="/dashboard/invoicing">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al listado
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 shadow-sm bg-card overflow-hidden">
        <PosInvoiceEditor
          initial={{ status: 'draft' }}
          isSaving={createMutation.isPending}
          onSave={async (payload) => {
            const result = await createMutation.mutateAsync(payload);
            toast({ 
              title: '¡Factura creada exitosamente!', 
              description: `Se ha guardado la factura ${result.invoiceNumber} como borrador.` 
            });
            router.push(`/dashboard/invoicing/${encodeURIComponent(result.id)}`);
          }}
        />
      </div>
    </div>
  );
}

