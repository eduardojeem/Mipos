"use client";

import { MarketplaceHeader } from './MarketplaceHeader';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
}

export function MarketplaceLayout({ children, searchQuery }: MarketplaceLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.08),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_28%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_42%,_#eef4f3_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_42%,_#111827_100%)] dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-amber-300/15 blur-3xl opacity-50 dark:bg-blue-500/15" />
        <div className="absolute right-[-8rem] top-[10rem] h-[22rem] w-[22rem] rounded-full bg-emerald-300/10 blur-3xl opacity-50 dark:bg-emerald-500/15" />
      </div>
      
      <MarketplaceHeader searchQuery={searchQuery} />
      
      <main className="relative z-10 pb-20">
        {children}
      </main>

      <footer className="border-t border-slate-200/60 bg-white/50 py-12 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-950/60">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} MiPOS Marketplace. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
