import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { StaticBusinessConfigProvider } from '@/contexts/BusinessConfigContext';
import { MarketplaceHeader } from '@/app/home/components/marketplace/MarketplaceHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SectionDisabledState from '@/components/public-tenant/SectionDisabledState';
import { maybeGetCurrentOrganization } from '@/lib/organization/get-current-organization';
import { getPublicBusinessConfig } from '@/lib/public-site/data';
import TrackOrderClient from './TrackOrderClient';

export const dynamic = 'force-dynamic';

export default async function TrackOrderPage() {
  const organization = await maybeGetCurrentOrganization();

  if (!organization) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef4f3_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_42%,_#111827_100%)] dark:text-slate-100">
        <MarketplaceHeader />
        <main className="mx-auto flex min-h-[calc(100vh-84px)] max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
          <Card className="w-full rounded-2xl border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <PackageSearch className="h-6 w-6 text-slate-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Seguimiento de pedidos</h1>
              <p className="mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400">
                Para ver el detalle de una compra hay que entrar desde la tienda donde compraste. Desde Mi cuenta tambien
                podes abrir cada pedido y el sistema te lleva al negocio correcto.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link href="/account">Ir a Mi cuenta</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/home">Ver tiendas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const config = await getPublicBusinessConfig(organization);

  if (!config.publicSite?.sections?.showOrderTracking) {
    return (
      <StaticBusinessConfigProvider
        config={config}
        organizationId={organization.id}
        organizationName={organization.name}
      >
        <SectionDisabledState
          config={config}
          title="Seguimiento no disponible"
          description="El seguimiento publico de pedidos fue desactivado para este tenant."
        />
      </StaticBusinessConfigProvider>
    );
  }

  return (
    <StaticBusinessConfigProvider
      config={config}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      <TrackOrderClient />
    </StaticBusinessConfigProvider>
  );
}
