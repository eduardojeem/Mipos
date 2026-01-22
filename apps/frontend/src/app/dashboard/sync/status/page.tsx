"use client";

import React from 'react';
import { syncCoordinator, type SyncStatus } from '@/lib/sync/sync-coordinator';
import { syncLogger, type SyncLogEntry, type SyncMetrics } from '@/lib/sync/sync-logging';

function StatCard({ title, value, subtitle, accent }: { title: string; value: string | number; subtitle?: string; accent?: 'green'|'yellow'|'red'|'blue' }) {
  const accentMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`p-4 rounded-lg border ${accent ? accentMap[accent] : 'bg-white border-gray-200'}`}>
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function LogsTable({ logs }: { logs: SyncLogEntry[] }) {
  const levelClass = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-700';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-800';
    }
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-gray-100 font-medium">Logs recientes</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500">Hora</th>
              <th className="px-3 py-2 text-left text-gray-500">Nivel</th>
              <th className="px-3 py-2 text-left text-gray-500">Mensaje</th>
              <th className="px-3 py-2 text-left text-gray-500">Duración</th>
            </tr>
          </thead>
          <tbody>
            {logs.slice(-100).reverse().map((l, idx) => (
              <tr key={`${l.timestamp}-${idx}`} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</td>
                <td className={`px-3 py-2 font-medium ${levelClass(l.level)}`}>{l.level.toUpperCase()}</td>
                <td className="px-3 py-2 text-gray-800">{l.message}</td>
                <td className="px-3 py-2 text-gray-500">{typeof l.durationMs === 'number' ? `${l.durationMs} ms` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SyncStatusPage() {
  const [status, setStatus] = React.useState<SyncStatus>(syncCoordinator.getStatus());
  const [metrics, setMetrics] = React.useState<SyncMetrics>(syncLogger.getMetrics());
  const [logs, setLogs] = React.useState<SyncLogEntry[]>(syncLogger.getLogs(200));

  React.useEffect(() => {
    syncCoordinator.start();
    const interval = window.setInterval(() => {
      setStatus(syncCoordinator.getStatus());
    }, 1000);
    const unsubMetrics = syncLogger.subscribe((m) => {
      setMetrics(m);
      setLogs(syncLogger.getLogs(200));
    });
    return () => {
      window.clearInterval(interval);
      unsubMetrics();
    };
  }, []);

  const avgRefresh = metrics.avgLatencyByOp?.refreshRealtimeSubscriptions ?? 0;
  const avgReconnect = metrics.avgLatencyByOp?.attemptReconnection ?? 0;

  const alerts: { type: 'error'|'warning'; text: string }[] = [];
  if ((metrics.errors || 0) > 0) {
    alerts.push({ type: 'error', text: `Errores recientes: ${metrics.errors}` });
  }
  if (!status.isRealtimeActive && status.isPollingActive) {
    alerts.push({ type: 'warning', text: 'En modo fallback de polling' });
  }

  const forceSync = () => syncCoordinator.forceMethod('realtime');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard de Estado de Sincronización</h1>
        <div className="flex gap-2">
          <button onClick={() => forceSync()} className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Forzar Sync</button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`p-3 rounded-md border ${a.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              {a.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Método" value={status.syncMethod ?? '—'} accent={status.syncMethod === 'realtime' ? 'green' : status.syncMethod === 'polling' ? 'yellow' : 'red'} />
        <StatCard title="Realtime activo" value={status.isRealtimeActive ? 'Sí' : 'No'} accent={status.isRealtimeActive ? 'green' : 'red'} />
        <StatCard title="Polling activo" value={status.isPollingActive ? 'Sí' : 'No'} accent={status.isPollingActive ? 'yellow' : 'blue'} />
        <StatCard title="Última sync" value={status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleTimeString() : '—'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Eventos realtime" value={metrics.realtimeEvents} />
        <StatCard title="Eventos polling" value={metrics.pollingEvents} />
        <StatCard title="Throughput/min" value={metrics.throughputPerMin} />
        <StatCard title="Errores" value={metrics.errors} accent={metrics.errors > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard title="Latencia promedio: Refresh suscripciones" value={`${Math.round(avgRefresh)} ms`} subtitle="refreshRealtimeSubscriptions" />
        <StatCard title="Latencia promedio: Reconexión" value={`${Math.round(avgReconnect)} ms`} subtitle="attemptReconnection" />
      </div>

      <LogsTable logs={logs} />
    </div>
  );
}