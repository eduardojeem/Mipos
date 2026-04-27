import { notFound } from 'next/navigation';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { OrganizationGrid } from '../components/marketplace/OrganizationGrid';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { getGlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default async function OrganizationsPage() {
  const context = await resolveRequestTenantContext();

  if (context.kind !== 'root') {
    notFound();
  }

  const data = await getGlobalMarketplaceHomeData(context.hostname);

  return (
    <MarketplaceLayout>
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="outline" className="mb-4 rounded-full border-blue-200 bg-blue-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
          Directorio de empresas
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Marcas <span className="text-blue-600">Destacadas</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Conoce a las empresas que confían en MiPOS para gestionar sus ventas y catálogos.
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center gap-2 mb-8 text-sm font-semibold text-slate-500 uppercase tracking-widest">
           <Building2 className="h-4 w-4" />
           {data.featuredOrganizations.length} empresas publicadas
        </div>
        <OrganizationGrid organizations={data.featuredOrganizations} />
      </div>
    </MarketplaceLayout>
  );
}
