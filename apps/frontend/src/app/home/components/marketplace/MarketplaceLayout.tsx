"use client";

import { MarketplaceHeader } from './MarketplaceHeader';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
}

export function MarketplaceLayout({ children, searchQuery }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#f4f6f8_42%,_#eef2f6_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_48%,_#111827_100%)] dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-slate-300/20 blur-3xl opacity-40 dark:bg-slate-600/15" />
        <div className="absolute right-[-8rem] top-[10rem] h-[22rem] w-[22rem] rounded-full bg-blue-200/10 blur-3xl opacity-40 dark:bg-blue-500/10" />
      </div>
      
      <MarketplaceHeader searchQuery={searchQuery} />
      
      <main className="relative z-10 pb-20">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 bg-white/50 py-12 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} MITIENDA Marketplace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
