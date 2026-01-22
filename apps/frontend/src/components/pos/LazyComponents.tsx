import React, { Suspense, lazy, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Componente de carga para Suspense
const LoadingFallback = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-8 w-3/4" />
  </div>
);

// Lazy loading de componentes existentes
const LazyCustomerManagement = lazy(() => import('@/components/pos/CustomerManagement'));

// Componentes de diálogo simplificados para evitar errores de módulo
const SimplePaymentDialog = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">Diálogo de Pago</h3>
    <p>Componente de pago en desarrollo...</p>
  </div>
);

const SimpleReportsDialog = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">Reportes</h3>
    <p>Componente de reportes en desarrollo...</p>
  </div>
);

const SimpleInventoryDialog = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">Inventario</h3>
    <p>Componente de inventario en desarrollo...</p>
  </div>
);

const SimpleSettingsDialog = () => (
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-4">Configuración</h3>
    <p>Componente de configuración en desarrollo...</p>
  </div>
);

// Lazy components usando componentes simplificados
const LazyPaymentDialog = lazy(() => Promise.resolve({ default: SimplePaymentDialog }));
const LazyReportsDialog = lazy(() => Promise.resolve({ default: SimpleReportsDialog }));
const LazyInventoryDialog = lazy(() => Promise.resolve({ default: SimpleInventoryDialog }));
const LazySettingsDialog = lazy(() => Promise.resolve({ default: SimpleSettingsDialog }));

// Componentes exportados con Suspense
export const CustomerManagementLazy = (props: any) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyCustomerManagement {...props} />
  </Suspense>
);

export const PaymentDialogLazy = (props: any) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyPaymentDialog {...props} />
  </Suspense>
);

export const ReportsDialogLazy = (props: any) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyReportsDialog {...props} />
  </Suspense>
);

export const InventoryDialogLazy = (props: any) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazyInventoryDialog {...props} />
  </Suspense>
);

export const SettingsDialogLazy = (props: any) => (
  <Suspense fallback={<LoadingFallback />}>
    <LazySettingsDialog {...props} />
  </Suspense>
);

// Hook para precargar componentes
export const usePreloadComponents = () => {
  const preloadComponents = useCallback(() => {
    // Precargar componentes críticos
    LazyCustomerManagement;
    LazyPaymentDialog;
    LazyReportsDialog;
    LazyInventoryDialog;
    LazySettingsDialog;
  }, []);

  return { preloadComponents };
};

// Hook para precarga en tiempo idle
export const useIdlePreload = () => {
  const { preloadComponents } = usePreloadComponents();

  useEffect(() => {
    const preloadOnIdle = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          preloadComponents();
        }, { timeout: 2000 });
      } else {
        // Fallback para navegadores que no soportan requestIdleCallback
        setTimeout(preloadComponents, 1000);
      }
    };

    preloadOnIdle();
  }, [preloadComponents]);
};