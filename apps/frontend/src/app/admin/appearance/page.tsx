'use client';

import dynamic from 'next/dynamic';
import { Palette, Sparkles } from 'lucide-react';
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
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-border/40 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
            <Palette className="h-3.5 w-3.5" />
            Configuración Visual
          </div>
          <h1 className="mt-4 text-4xl font-extrabold text-foreground tracking-tight">Apariencia</h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            Personaliza el tema, los colores de acento y la densidad de la interfaz para adaptar el sistema a tus preferencias.
          </p>
        </div>
      </section>

      <AppearanceTab />
    </div>
  );
}
