'use client';

import dynamic from 'next/dynamic';
import { Palette } from 'lucide-react';
import { SettingsLoadingSkeleton } from '@/app/dashboard/settings/components/SettingsLoadingSkeleton';

const AppearanceTab = dynamic(
  () => import('@/app/dashboard/settings/components/AppearanceTab').then((module) => module.AppearanceTab),
  {
    ssr: false,
    loading: () => <SettingsLoadingSkeleton />,
  }
);

export default function AdminAppearancePage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Apariencia</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tema, densidad y estilo visual de tu experiencia en MiPOS.
            </p>
          </div>
        </div>
      </section>

      <AppearanceTab />
    </div>
  );
}
