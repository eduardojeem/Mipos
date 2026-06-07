import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { SuperAdminGuard } from '../components/SuperAdminGuard';

export const dynamic = 'force-dynamic';

export default function SuperAdminAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Superadmin
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Analíticas
            </h1>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Indicadores para revisar crecimiento, ingresos recurrentes, distribucion de planes y actividad de la plataforma.
            </p>
          </div>
        </header>

        <AnalyticsDashboard />
      </div>
    </SuperAdminGuard>
  );
}
