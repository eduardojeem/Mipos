import { notFound } from 'next/navigation';
import { MarketplaceLayout } from '../components/marketplace/MarketplaceLayout';
import { ProductGrid } from '../components/marketplace/ProductGrid';
import { resolveRequestTenantContext } from '@/lib/domain/request-tenant';
import { getGlobalMarketplaceHomeData } from '@/lib/public-site/data';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag } from 'lucide-react';

export default async function CatalogPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ q?: string }> 
}) {
  const context = await resolveRequestTenantContext();
  const params = await searchParams;
  const query = String(params.q || '').trim();

  if (context.kind !== 'root') {
    notFound();
  }

  const data = await getGlobalMarketplaceHomeData(context.hostname, query);

  return (
    <MarketplaceLayout searchQuery={query}>
      <header className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Badge variant="outline" className="mb-4 rounded-full border-amber-200 bg-amber-50/50 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
          Explorar todo
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Catálogo <span className="text-amber-600">Global</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Descubre miles de productos públicos ofrecidos por las empresas activas en nuestra red.
        </p>
        
        {query && (
           <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 text-sm text-amber-900">
              Mostrando resultados para &quot;<span className="font-bold">{query}</span>&quot;
           </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center gap-2 mb-8 text-sm font-semibold text-slate-500 uppercase tracking-widest">
           <ShoppingBag className="h-4 w-4" />
           {data.featuredProducts.length} productos encontrados
        </div>
        <ProductGrid products={data.featuredProducts} />
        
        {data.featuredProducts.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg text-slate-500">No se encontraron productos que coincidan con tu búsqueda.</p>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
