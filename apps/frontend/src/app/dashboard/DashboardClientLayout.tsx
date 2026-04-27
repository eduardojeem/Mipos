'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useIsAuthenticated, useResolvedRole } from '@/hooks/use-auth';
import { navigation as sidebarNavigation, type NavItem as SidebarNavItem, Sidebar } from '@/components/dashboard/sidebar';
import { MobileNavigation } from '@/components/dashboard/MobileNavigation';
import { Header } from '@/components/dashboard/header';
import { KeyboardShortcuts } from '@/components/keyboard/keyboard-shortcuts';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary';

const ConnectionIndicator = dynamic<{ size?: 'sm' | 'md' | 'lg' }>(
  () => import('@/components/ui/connection-indicator').then((module) => module.ConnectionIndicator),
  { ssr: false }
);

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useIsAuthenticated();
  const resolvedRole = useResolvedRole();

  useEffect(() => {
    if (!isAuthenticated) return;

    let syncStarted = false;
    let cleanupDone = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const load = async (attempt = 1) => {
      try {
        if (cleanupDone) return;

        const { syncCoordinator } = await import(
          /* webpackPrefetch: true, webpackChunkName: "sync-coordinator" */ '@/lib/sync/sync-coordinator'
        );

        if (!cleanupDone) {
          syncCoordinator.start();
          syncStarted = true;
        }
      } catch (error: unknown) {
        const err = error as Error;
        const isChunkError = err && (err.name === 'ChunkLoadError' || /Loading chunk/i.test(String(err)));

        if (isChunkError && attempt < 3 && !cleanupDone) {
          timeoutId = globalThis.setTimeout(() => {
            void load(attempt + 1);
          }, 1500 * attempt);
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.warn('Sync coordinator failed to start:', err);
        }
      }
    };

    const requestIdle =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : null;

    if (requestIdle) {
      idleCallbackId = requestIdle(() => {
        void load();
      }, { timeout: 2500 });
    } else {
      timeoutId = globalThis.setTimeout(() => {
        void load();
      }, 1800);
    }

    return () => {
      cleanupDone = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (
        idleCallbackId !== null &&
        typeof window !== 'undefined' &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }

      if (syncStarted) {
        void import('@/lib/sync/sync-coordinator')
          .then(({ syncCoordinator }) => {
            syncCoordinator.stop();
          })
          .catch(() => {});
      }
    };
  }, [isAuthenticated]);

  const navigationItems = useMemo(() => {
    const items: SidebarNavItem[] = sidebarNavigation;
    const userRole = resolvedRole || 'CASHIER';

    return items.filter((item) => {
      if (!item.roles) return true;
      return item.roles.includes(userRole) || (userRole === 'SUPER_ADMIN' && item.roles.includes('ADMIN'));
    });
  }, [resolvedRole]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
            <Loader2 className="relative z-10 h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-lg font-medium text-foreground/80">Iniciando sesion...</p>
            <p className="animate-pulse text-sm text-muted-foreground">Preparando tu espacio de trabajo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardErrorBoundary>
      <ResponsiveLayout
        className="transition-colors duration-300"
        sidebar={<Sidebar />}
        mobileSidebar={<MobileNavigation items={navigationItems} />}
        header={<Header compact />}
      >
        {children}

        <KeyboardShortcuts />

        <div className="fixed bottom-3 right-3 z-50">
          <ConnectionIndicator size="sm" />
        </div>
      </ResponsiveLayout>
    </DashboardErrorBoundary>
  );
}
