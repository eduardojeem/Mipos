'use client';

import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
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

// Component loading fallback
const ComponentLoader = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  </div>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, loading } = useIsAuthenticated();
  const { user } = useAuth();

  // Iniciar el coordinador de sincronización de forma optimizada
  useEffect(() => {
    if (!isAuthenticated) return;

    let syncStarted = false;

    // Delay sync start to not block initial render
    const timeoutId = setTimeout(() => {
      const load = async (attempt = 1) => {
        try {
          const { syncCoordinator } = await import(/* webpackPrefetch: true */ '@/lib/sync/sync-coordinator');
          syncCoordinator.start();
          syncStarted = true;
        } catch (error: any) {
          const isChunkError = error && (error.name === 'ChunkLoadError' || /Loading chunk/i.test(String(error)));
          if (isChunkError && attempt < 3) {
            setTimeout(() => load(attempt + 1), 1500 * attempt);
            return;
          }
          console.warn('Sync coordinator failed to start:', error);
        }
      };
      void load();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      if (syncStarted) {
        try {
          import('@/lib/sync/sync-coordinator').then(({ syncCoordinator }) => {
            syncCoordinator.stop();
          });
        } catch {/* noop */ }
      }
    };
  }, [isAuthenticated]);

  const handleMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // ✅ Fuente unificada: reutilizar navegación del Sidebar para evitar desincronización
  const navigationItems = useMemo(() => {
    const items: SidebarNavItem[] = sidebarNavigation;
    const userRole = user?.role || 'CASHIER';
    return items.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(userRole) || (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
    });
  }, [user]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-4" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-foreground">Verificando autenticación...</p>
          <p className="text-sm text-muted-foreground">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <UserAppearanceManager />
      <UnifiedPermissionGuard resource="dashboard" action="read" allowAdmin>
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
