import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { SuperAdminGuard } from '../components/SuperAdminGuard';
import { Activity } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SuperAdminAnalyticsPage() {
  return (
    <SuperAdminGuard>
      <div className="space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-emerald-600/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10">
              <Activity className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-50 md:text-3xl">
                  Analíticas
                </h1>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  SaaS
                </span>
              </div>
              <p className="mt-0.5 max-w-2xl text-sm text-slate-400">
                Crecimiento, ingresos recurrentes, distribución de planes y actividad de la plataforma.
              </p>
            </div>
          </div>
        </div>

        <AnalyticsDashboard />

      </div>
    </SuperAdminGuard>
  );
}
