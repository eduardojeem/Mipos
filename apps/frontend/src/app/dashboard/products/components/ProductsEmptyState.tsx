'use client';

import { Package, Plus, Upload, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';

export function ProductsEmptyState() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-6">
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/', icon: LayoutDashboard },
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Productos', href: '/dashboard/products', isCurrentPage: true }
        ]}
      />
      
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-2xl font-bold mb-2">No hay productos</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Comienza agregando tu primer producto al inventario. Puedes crear productos 
            manualmente o importarlos desde un archivo.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/dashboard/products/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Producto
            </Button>
            <Button 
              variant="outline" 
              onClick={() => toast.info('Importar próximamente...')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar Productos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
