'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanSyncContext } from '@/contexts/plan-sync-context';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SETTINGS_NAVIGATION,
  getSettingsHref,
  normalizeSettingsTab,
  type SettingsNavigationItem,
} from './settings-navigation';

const GROUPS: SettingsNavigationItem['group'][] = ['Core', 'Operacion', 'Plataforma'];

const GROUP_LABELS: Record<SettingsNavigationItem['group'], string> = {
  Core: 'Tu negocio',
  Operacion: 'Operación',
  Plataforma: 'Plataforma',
};

const STORAGE_KEY = 'settings_sidebar_collapsed';

export default function SettingsSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { company, planDisplayName } = usePlanSyncContext();
  const currentTab = normalizeSettingsTab(searchParams?.get('tab'));

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {}
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const isActive = (item: SettingsNavigationItem) => {
    const isSettingsPath =
      pathname === '/dashboard/settings' || pathname === '/dashboard/settings/general';
    return isSettingsPath && currentTab === item.id;
  };

  const companyInitial = (company?.name || 'N').charAt(0).toUpperCase();

  // During SSR / before mount, render expanded to avoid layout shift
  const isCollapsed = mounted && collapsed;

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'relative flex shrink-0 flex-col gap-3 transition-all duration-300 ease-in-out xl:sticky xl:top-6 xl:self-start',
          isCollapsed ? 'xl:w-[60px]' : 'xl:w-[296px]'
        )}
      >
        {/* Company card */}
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300',
            isCollapsed && 'xl:flex xl:flex-col xl:items-center xl:py-3'
          )}
        >
          {!isCollapsed && (
            <>
              <div className="h-14 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
              <div className="-mt-7 px-5 pb-5">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border-4 border-background bg-primary text-xl font-bold text-primary-foreground shadow-md">
                  {companyInitial}
                </div>
                <p className="truncate font-semibold leading-tight">{company?.name || 'Mi negocio'}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {planDisplayName || 'Plan activo'}
                </p>
              </div>
            </>
          )}

          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 cursor-default items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                  {companyInitial}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col">
                <span className="font-semibold">{company?.name || 'Mi negocio'}</span>
                <span className="text-xs text-muted-foreground">{planDisplayName || 'Plan activo'}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Desktop nav */}
        <nav
          className={cn(
            'hidden rounded-xl border border-border/50 bg-card shadow-sm xl:block',
            isCollapsed ? 'p-2' : 'p-2'
          )}
        >
          {GROUPS.map((group) => {
            const groupItems = SETTINGS_NAVIGATION.filter((item) => item.group === group);
            return (
              <div key={group} className="py-1.5 first:pt-1 last:pb-1">
                {!isCollapsed && (
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {GROUP_LABELS[group]}
                  </p>
                )}
                {isCollapsed && (
                  <div className="my-1 h-px w-full bg-border/60" />
                )}
                <div className="space-y-0.5">
                  {groupItems.map((item) => {
                    const active = isActive(item);
                    const linkEl = (
                      <Link
                        key={item.id}
                        href={getSettingsHref(item.id)}
                        className={cn(
                          'flex items-center rounded-lg transition-all duration-150',
                          isCollapsed
                            ? 'h-9 w-9 justify-center'
                            : 'gap-3 px-3 py-2.5',
                          active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-foreground hover:bg-muted/70'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            active ? 'text-primary-foreground' : 'text-muted-foreground'
                          )}
                        />
                        {!isCollapsed && (
                          <span className="font-medium">{item.name}</span>
                        )}
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                          <TooltipContent side="right">{item.name}</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return linkEl;
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Mobile: horizontal scroll */}
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 xl:hidden">
          {SETTINGS_NAVIGATION.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.id}
                href={getSettingsHref(item.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Toggle button — only on xl */}
        <button
          onClick={toggle}
          aria-label={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          className={cn(
            'absolute -right-3.5 top-[72px] z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-card shadow-md transition-all duration-200 hover:bg-muted xl:flex',
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
