'use client';

import Link from 'next/link';
import { ArrowLeft, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BranchesSettings } from '@/app/dashboard/settings/components/SettingsSections';

export default function SucursalPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Locales operativos — gestiona sedes, usuarios asignados, cajas y estadísticas por sucursal.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/settings?tab=branches">
              <Settings className="h-3.5 w-3.5" />
              Configuración
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/admin">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Link>
          </Button>
        </div>
      </div>

      {/* Branch management — reuses the full BranchesSettings component */}
      <BranchesSettings />
    </div>
  );
}
