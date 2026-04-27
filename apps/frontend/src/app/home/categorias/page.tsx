import { notFound } from 'next/navigation';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { CategoryGrid } from '../components/marketplace/CategoryGrid';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { getGlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { Badge } from '@/components/ui/badge';
import { Layers3 } from 'lucide-react';

export default async function CategoriesPage() {
  const context = await resolveRequestTenantContext();

  if (context.kind !== 'root') {
    notFound();
  }

  const data = await getGlobalMarketplaceHomeData(context.hostname);

  return (
    <MarketplaceLayout>
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="outline" className="mb-4 rounded-full border-emerald-200 bg-emerald-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          Explorar por rubro
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Categorías <span className="text-emerald-600">Globales</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Todas las industrias y sectores activos en MiPOS, organizados para tu descubrimiento.
        </p>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center gap-2 mb-8 text-sm font-semibold text-slate-500 uppercase tracking-widest">
           <Layers3 className="h-4 w-4" />
           {data.featuredCategories.length} categorías activas
        </div>
        <CategoryGrid categories={data.featuredCategories} />
      </div>
    </MarketplaceLayout>
  );
}
