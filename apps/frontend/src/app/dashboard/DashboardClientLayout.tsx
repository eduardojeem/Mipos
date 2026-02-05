'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useIsAuthenticated, useAuth } from '@/hooks/use-auth';
import { navigation as sidebarNavigation, type NavItem as SidebarNavItem } from '@/components/dashboard/sidebar';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { UnifiedPermissionGuard } from '@/components/auth/UnifiedPermissionGuard';
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary';
import { Loader2 } from 'lucide-react';

// Core dashboard components (static imports for stability)
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileNavigation } from '@/components/dashboard/MobileNavigation';
import { Header } from '@/components/dashboard/header';
import { KeyboardShortcuts } from '@/components/keyboard/keyboard-shortcuts';
import { UserAppearanceManager } from '@/components/dashboard/UserAppearanceManager';
import dynamic from 'next/dynamic';
const ConnectionIndicator = dynamic(
  () => import('@/components/ui/connection-indicator').then(m => m.ConnectionIndicator),
  { ssr: false }
);

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, loading } = useIsAuthenticated();
  const { user } = useAuth();

  // Iniciar el coordinador de sincronización de forma optimizada (NO BLOQUEANTE)
  useEffect(() => {
    if (!isAuthenticated) return;

    let syncStarted = false;
    let cleanupDone = false;

    // Delay sync start más para no interferir con la navegación inicial
    const timeoutId = setTimeout(() => {
      const load = async (attempt = 1) => {
        try {
          // Verificar que no se haya limpiado antes de iniciar
          if (cleanupDone) return;

          const { syncCoordinator } = await import(/* webpackPrefetch: true, webpackChunkName: "sync-coordinator" */ '@/lib/sync/sync-coordinator');

          // Double check antes de iniciar
          if (!cleanupDone) {
            syncCoordinator.start();
            syncStarted = true;
          }
        } catch (err: unknown) {
          const error = err as Error;
          const isChunkError = error && (error.name === 'ChunkLoadError' || /Loading chunk/i.test(String(error)));
          if (isChunkError && attempt < 3 && !cleanupDone) {
            setTimeout(() => load(attempt + 1), 1500 * attempt);
            return;
          }
          // Solo advertir en desarrollo
          if (process.env.NODE_ENV === 'development') {
            console.warn('Sync coordinator failed to start:', error);
          }
        }
      };
      void load();
    }, 2000); // Aumentado de 1s a 2s para no bloquear navegación

    return () => {
      cleanupDone = true;
      clearTimeout(timeoutId);
      if (syncStarted) {
        // Cleanup asíncrono sin bloquear
        void import('@/lib/sync/sync-coordinator').then(({ syncCoordinator }) => {
          syncCoordinator.stop();
        }).catch(() => {/* noop */ });
      }
    };
  }, [isAuthenticated]);

  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // ✅ Fuente unificada: reutilizar navegación del Sidebar para evitar desincronización
  // Memoizado con useMemo para evitar recálculos innecesarios
  const navigationItems = useMemo(() => {
    const items: SidebarNavItem[] = sidebarNavigation;
    const userRole = user?.role || 'CASHIER';
    return items.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(userRole) || (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
    });
  }, [user?.role]); // Solo re-calcular cuando cambie el rol, no todo el objeto user

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin relative z-10" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground/80">Iniciando sesión...</p>
            <p className="text-sm text-muted-foreground animate-pulse">Preparando tu espacio de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <UserAppearanceManager />
      <UnifiedPermissionGuard roles={[
        'SUPER_ADMIN',
        'ADMIN',
        'OWNER',
        'MANAGER',
        'CASHIER',
        'EMPLOYEE',
        'USER'
      ]} allowAdmin>
        <ResponsiveLayout
          className="transition-colors duration-300"
          sidebar={<Sidebar />}
          mobileSidebar={<MobileNavigation items={navigationItems} />}
          header={
            <Header
              onMenuClick={handleMenuClick}
              isMobileMenuOpen={isMobileMenuOpen}
              compact
            />
          }
        >
          {children}

          <KeyboardShortcuts />

          <div className="fixed bottom-3 right-3 z-50">
            <ConnectionIndicator size="sm" />
          </div>
        </ResponsiveLayout>
      </UnifiedPermissionGuard>
    </DashboardErrorBoundary>
  );
}
