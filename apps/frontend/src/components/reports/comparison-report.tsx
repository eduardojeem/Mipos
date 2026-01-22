'use client';

import React, { useState, useMemo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import * as ReactWindow from 'react-window';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const List = (ReactWindow as any).FixedSizeList;
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSeriesBarChart } from '@/components/ui/charts';
import { FilterBuilder, SharedFilters } from './filter-builder';
import { useCompareReports, DATE_PRESETS, useReportExport, type ComparisonDimension, type ComparisonGroupBy } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';
import { NoDataAvailable } from '@/components/ui/empty-state';
import { BarChart3, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TooltipExport from './tooltip-export';
import { useToast } from '@/components/ui/use-toast';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const SimpleLineChart: React.FC<{ data: number[]; height?: number }> = ({ data, height = 40 }) => {
  const chartData = {
    labels: data.map((_, index) => `Day ${index + 1}`),
    datasets: [
      {
        data,
        borderColor: 'hsl(210, 80%, 50%)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export const ComparisonReport: React.FC = () => {
  const { toast } = useToast();
  const [periodA, setPeriodA] = useState<{ startDate: string; endDate: string }>(() => {
    const p = DATE_PRESETS.thisMonth.getValue();
    return { startDate: p.startDate!, endDate: p.endDate! };
  });
  const [periodB, setPeriodB] = useState<{ startDate: string; endDate: string }>(() => {
    const p = DATE_PRESETS.lastMonth.getValue();
    return { startDate: p.startDate!, endDate: p.endDate! };
  });
  const [opts, setOpts] = useState<{ dimension: ComparisonDimension; groupBy: ComparisonGroupBy }>({ dimension: 'overall', groupBy: 'day' });
  const [sharedFilters, setSharedFilters] = useState<SharedFilters>({});
  const groupLabel = opts.groupBy === 'day' ? 'día' : 'mes';

  const compare = useCompareReports({ ...periodA, ...sharedFilters }, { ...periodB, ...sharedFilters }, opts, { initialFetch: true, refreshOnFocus: true, enabled: true });
  const { exportComparison, isExporting } = useReportExport();

  const seriesData = useMemo(() => {
    if (!compare.data) return [] as any[];
    const labels = Array.from(new Set([...compare.data.periodA.byDate.map(d => d.key), ...compare.data.periodB.byDate.map(d => d.key)])).sort();
    const aMap = new Map(compare.data.periodA.byDate.map(d => [d.key, d.revenue]));
    const bMap = new Map(compare.data.periodB.byDate.map(d => [d.key, d.revenue]));
    return labels.map(label => ({
      label,
      datasets: [
        { name: 'Periodo A', value: aMap.get(label) || 0, color: 'hsl(210, 80%, 50%)' },
        { name: 'Periodo B', value: bMap.get(label) || 0, color: 'hsl(340, 70%, 50%)' },
      ]
    }));
  }, [compare.data]);

  const trendA = useMemo(() => (compare.data ? compare.data.periodA.byDate.map(d => d.revenue) : []), [compare.data]);
  const trendB = useMemo(() => (compare.data ? compare.data.periodB.byDate.map(d => d.revenue) : []), [compare.data]);

  const deltas = compare.data?.deltas;
  const ordersDelta = deltas?.ordersChangePct ?? 0;
  const revenueDelta = deltas?.revenueChangePct ?? 0;
  const profitDelta = deltas?.profitChangePct ?? 0;

  const refresh = () => compare.refresh();

  const exportCSV = () => {
    if (!compare.data) return;
    const labels = Array.from(new Set([...compare.data.periodA.byDate.map(d => d.key), ...compare.data.periodB.byDate.map(d => d.key)])).sort();
    const aRev = new Map(compare.data.periodA.byDate.map(d => [d.key, d.revenue]));
    const aOrd = new Map(compare.data.periodA.byDate.map(d => [d.key, d.orders]));
    const aProf = new Map(compare.data.periodA.byDate.map(d => [d.key, d.profit]));
    const bRev = new Map(compare.data.periodB.byDate.map(d => [d.key, d.revenue]));
    const bOrd = new Map(compare.data.periodB.byDate.map(d => [d.key, d.orders]));
    const bProf = new Map(compare.data.periodB.byDate.map(d => [d.key, d.profit]));
    const headers = [
      'Fecha',
      'A_Ingresos',
      'A_Ordenes',
      'A_Utilidad',
      'B_Ingresos',
      'B_Ordenes',
      'B_Utilidad',
      'Cambio_Ingresos',
      'Cambio_Ingresos_%'
    ];
    const rows = labels.map((label) => {
      const ar = aRev.get(label) || 0;
      const ao = aOrd.get(label) || 0;
      const ap = aProf.get(label) || 0;
      const br = bRev.get(label) || 0;
      const bo = bOrd.get(label) || 0;
      const bp = bProf.get(label) || 0;
      const diff = br - ar;
      const pct = ar > 0 ? ((diff / ar) * 100) : (br > 0 ? 100 : 0);
      return [label, ar, ao, ap, br, bo, bp, diff, Number(pct.toFixed(2))];
    });
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacion_${periodA.startDate}_${periodA.endDate}_vs_${periodB.startDate}_${periodB.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: 'CSV de comparación generado' });
  };

  const exportJSON = () => {
    if (!compare.data) return;
    const payload = {
      periodA: compare.data.periodA,
      periodB: compare.data.periodB,
      deltas: compare.data.deltas,
      meta: {
        periodA,
        periodB,
      }
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacion_${periodA.startDate}_${periodA.endDate}_vs_${periodB.startDate}_${periodB.endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: 'JSON de comparación descargado' });
  };

  const exportCategoryCSV = () => {
    if (!compare.data) return;
    const a = compare.data.periodA.byCategory || [];
    const b = compare.data.periodB.byCategory || [];
    if (a.length === 0 && b.length === 0) return;
    const keys = Array.from(new Set([...a.map(x => x.category), ...b.map(x => x.category)]));
    const aMap = new Map(a.map(x => [x.category, x]));
    const bMap = new Map(b.map(x => [x.category, x]));
    const headers = ['Categoría','A_Ingresos','A_Utilidad','B_Ingresos','B_Utilidad','Delta_Ingresos','Delta_Ingresos_%'];
    const rows = keys.map((k) => {
      const av = aMap.get(k);
      const bv = bMap.get(k);
      const ar = av?.revenue || 0;
      const ap = (av?.profit ?? 0) as number;
      const br = bv?.revenue || 0;
      const bp = (bv?.profit ?? 0) as number;
      const diff = br - ar;
      const pct = ar > 0 ? ((diff / ar) * 100) : (br > 0 ? 100 : 0);
      return [k, ar, ap, br, bp, diff, Number(pct.toFixed(2))];
    });
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url;
    aTag.download = `comparacion_categorias_${periodA.startDate}_${periodA.endDate}_vs_${periodB.startDate}_${periodB.endDate}.csv`;
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: 'CSV de categorías generado' });
  };

  const exportProductCSV = () => {
    if (!compare.data) return;
    const a = compare.data.periodA.byProduct || [];
    const b = compare.data.periodB.byProduct || [];
    if (a.length === 0 && b.length === 0) return;
    const keys = Array.from(new Set([...a.map(x => x.id), ...b.map(x => x.id)]));
    const aMap = new Map(a.map(x => [x.id, x]));
    const bMap = new Map(b.map(x => [x.id, x]));
    const headers = ['Producto','A_Ingresos','A_Cantidad','A_Utilidad','B_Ingresos','B_Cantidad','B_Utilidad','Delta_Ingresos','Delta_Cantidad','Delta_Ingresos_%'];
    const rows = keys.map((id) => {
      const av = aMap.get(id);
      const bv = bMap.get(id);
      const name = av?.name || bv?.name || id;
      const ar = av?.revenue || 0;
      const aq = av?.quantity || 0;
      const ap = (av?.profit ?? 0) as number;
      const br = bv?.revenue || 0;
      const bq = bv?.quantity || 0;
      const bp = (bv?.profit ?? 0) as number;
      const diffR = br - ar;
      const diffQ = bq - aq;
      const pct = ar > 0 ? ((diffR / ar) * 100) : (br > 0 ? 100 : 0);
      return [name, ar, aq, ap, br, bq, bp, diffR, diffQ, Number(pct.toFixed(2))];
    });
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url;
    aTag.download = `comparacion_productos_${periodA.startDate}_${periodA.endDate}_vs_${periodB.startDate}_${periodB.endDate}.csv`;
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: 'CSV de productos generado' });
  };

  const exportCategoryCSVPeriod = (period: 'A' | 'B') => {
    if (!compare.data) return;
    const list = period === 'A' ? (compare.data.periodA.byCategory || []) : (compare.data.periodB.byCategory || []);
    if (list.length === 0) return;
    const headers = ['Categoría','Ingresos','Utilidad'];
    const rows = list.map((x) => [x.category, x.revenue || 0, Number((x.profit ?? 0) as number)]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url;
    const suffix = period === 'A' ? `${periodA.startDate}_${periodA.endDate}` : `${periodB.startDate}_${periodB.endDate}`;
    aTag.download = `categorias_${suffix}.csv`;
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: `CSV de categorías (${period}) generado` });
  };

  const exportProductCSVPeriod = (period: 'A' | 'B') => {
    if (!compare.data) return;
    const list = period === 'A' ? (compare.data.periodA.byProduct || []) : (compare.data.periodB.byProduct || []);
    if (list.length === 0) return;
    const headers = ['Producto','Ingresos','Cantidad','Utilidad'];
    const rows = list.map((x) => [x.name, x.revenue || 0, x.quantity || 0, Number((x.profit ?? 0) as number)]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const aTag = document.createElement('a');
    aTag.href = url;
    const suffix = period === 'A' ? `${periodA.startDate}_${periodA.endDate}` : `${periodB.startDate}_${periodB.endDate}`;
    aTag.download = `productos_${suffix}.csv`;
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    URL.revokeObjectURL(url);
    toast({ title: 'Éxito', description: `CSV de productos (${period}) generado` });
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación de períodos</CardTitle>
          <CardDescription>Selecciona dos rangos de fechas y la dimensión de comparación</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Periodo A */}
            <div className="space-y-4">
              <h4 className="font-medium">Periodo A</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startA">Fecha inicio</Label>
                  <Input id="startA" type="date" value={periodA.startDate} onChange={(e) => setPeriodA(p => ({ ...p, startDate: e.target.value }))} disabled={compare.loading || compare.updating} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endA">Fecha fin</Label>
                  <Input id="endA" type="date" value={periodA.endDate} onChange={(e) => setPeriodA(p => ({ ...p, endDate: e.target.value }))} disabled={compare.loading || compare.updating} />
                </div>
              </div>
            </div>

            {/* Periodo B */}
            <div className="space-y-4">
              <h4 className="font-medium">Periodo B</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startB">Fecha inicio</Label>
                  <Input id="startB" type="date" value={periodB.startDate} onChange={(e) => setPeriodB(p => ({ ...p, startDate: e.target.value }))} disabled={compare.loading || compare.updating} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endB">Fecha fin</Label>
                  <Input id="endB" type="date" value={periodB.endDate} onChange={(e) => setPeriodB(p => ({ ...p, endDate: e.target.value }))} disabled={compare.loading || compare.updating} />
                </div>
              </div>
            </div>
          </div>

          {/* Opciones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="space-y-2">
              <Label>Dimensión</Label>
              <Select value={opts.dimension} onValueChange={(v) => setOpts(o => ({ ...o, dimension: v as ComparisonDimension }))}>
                <SelectTrigger disabled={compare.loading || compare.updating}>
                  <SelectValue placeholder="Dimensión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">General</SelectItem>
                  <SelectItem value="product">Producto</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agrupar por</Label>
              <Select value={opts.groupBy} onValueChange={(v) => setOpts(o => ({ ...o, groupBy: v as ComparisonGroupBy }))}>
                <SelectTrigger disabled={compare.loading || compare.updating}>
                  <SelectValue placeholder="Agrupar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button className="flex-1" onClick={refresh} disabled={compare.loading || compare.updating}>
                {compare.loading || compare.updating ? 'Actualizando...' : 'Actualizar comparación'}
              </Button>
              <TooltipExport>
                <Button variant="outline" className="px-3" onClick={exportCSV} disabled={compare.loading || compare.updating || !compare.data}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </TooltipExport>
              <TooltipExport>
                <Button variant="outline" className="px-3" onClick={exportJSON} disabled={compare.loading || compare.updating || !compare.data}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </TooltipExport>
              {opts.dimension === 'category' && (
                <TooltipExport>
                  <Button variant="outline" className="px-3" onClick={exportCategoryCSV} disabled={compare.loading || compare.updating || !compare.data}>
                    <Download className="h-4 w-4 mr-2" />
                    Categorías CSV
                  </Button>
                </TooltipExport>
              )}
              {opts.dimension === 'category' && (
                <>
                  <TooltipExport>
                    <Button variant="outline" className="px-3" onClick={() => exportCategoryCSVPeriod('A')} disabled={compare.loading || compare.updating || !compare.data}>
                      <Download className="h-4 w-4 mr-2" />
                      Categorías A
                    </Button>
                  </TooltipExport>
                  <TooltipExport>
                    <Button variant="outline" className="px-3" onClick={() => exportCategoryCSVPeriod('B')} disabled={compare.loading || compare.updating || !compare.data}>
                      <Download className="h-4 w-4 mr-2" />
                      Categorías B
                    </Button>
                  </TooltipExport>
                </>
              )}
              {opts.dimension === 'product' && (
                <TooltipExport>
                  <Button variant="outline" className="px-3" onClick={exportProductCSV} disabled={compare.loading || compare.updating || !compare.data}>
                    <Download className="h-4 w-4 mr-2" />
                    Productos CSV
                  </Button>
                </TooltipExport>
              )}
              {opts.dimension === 'product' && (
                <>
                  <TooltipExport>
                    <Button variant="outline" className="px-3" onClick={() => exportProductCSVPeriod('A')} disabled={compare.loading || compare.updating || !compare.data}>
                      <Download className="h-4 w-4 mr-2" />
                      Productos A
                    </Button>
                  </TooltipExport>
                  <TooltipExport>
                    <Button variant="outline" className="px-3" onClick={() => exportProductCSVPeriod('B')} disabled={compare.loading || compare.updating || !compare.data}>
                      <Download className="h-4 w-4 mr-2" />
                      Productos B
                    </Button>
                  </TooltipExport>
                </>
              )}
              <TooltipExport>
                <Button variant="outline" className="px-3" onClick={() => exportComparison('pdf', periodA, periodB, opts)} disabled={compare.loading || compare.updating || !compare.data || isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </TooltipExport>
              <TooltipExport>
                <Button variant="outline" className="px-3" onClick={() => exportComparison('excel', periodA, periodB, opts)} disabled={compare.loading || compare.updating || !compare.data || isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </TooltipExport>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Builder de filtros compartidos */}
      <FilterBuilder filters={sharedFilters} onChange={setSharedFilters} />

      {/* Resúmenes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Periodo A</CardTitle>
            <CardDescription>{periodA.startDate} — {periodA.endDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Órdenes</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{compare.data?.periodA.summary.totalOrders ?? 0}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${ordersDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ordersDelta >= 0 ? '+' : ''}{ordersDelta.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Ingresos</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(compare.data?.periodA.summary.totalRevenue ?? 0)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${revenueDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenueDelta >= 0 ? '+' : ''}{revenueDelta.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Utilidad</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatCurrency(compare.data?.periodA.summary.totalProfit ?? 0)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${profitDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{profitDelta >= 0 ? '+' : ''}{profitDelta.toFixed(1)}%</span>
                </div>
              </div>
              <div className="mt-3">
                <SimpleLineChart data={trendA} height={40} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Periodo B</CardTitle>
            <CardDescription>{periodB.startDate} — {periodB.endDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Órdenes</span>
                <span className="font-semibold">{compare.data?.periodB.summary.totalOrders ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Ingresos</span>
                <span className="font-semibold">{formatCurrency(compare.data?.periodB.summary.totalRevenue ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Utilidad</span>
                <span className="font-semibold">{formatCurrency(compare.data?.periodB.summary.totalProfit ?? 0)}</span>
              </div>
              <div className="mt-3">
                <SimpleLineChart data={trendB} height={40} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Variaciones</CardTitle>
            <CardDescription>Periodo A vs B</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Órdenes</span><span className="font-semibold">{(compare.data?.deltas.ordersChangePct ?? 0).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span>Ingresos</span><span className="font-semibold">{(compare.data?.deltas.revenueChangePct ?? 0).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span>Utilidad</span><span className="font-semibold">{(compare.data?.deltas.profitChangePct ?? 0).toFixed(1)}%</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfica de ingresos por fecha */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos por {groupLabel}</CardTitle>
          <CardDescription>Comparación visual por período</CardDescription>
        </CardHeader>
        <CardContent>
          {compare.loading && (<div className="text-sm text-muted-foreground">Cargando...</div>)}
          {!compare.loading && (
            seriesData.length > 0 ? (
              <MultiSeriesBarChart data={seriesData} height={320} />
            ) : (
              <NoDataAvailable
                title="Sin datos para comparar"
                description="No se encontraron datos para los períodos seleccionados. Intenta ajustar las fechas o filtros."
                onRefresh={() => {
                  // Reset to default periods
                  const thisMonth = DATE_PRESETS.thisMonth.getValue();
                  const lastMonth = DATE_PRESETS.lastMonth.getValue();
                  setPeriodA({ startDate: thisMonth.startDate!, endDate: thisMonth.endDate! });
                  setPeriodB({ startDate: lastMonth.startDate!, endDate: lastMonth.endDate! });
                }}
              />
            )
          )}
        </CardContent>
      </Card>

      {/* Desgloses por dimensión */}
      {opts.dimension === 'category' && compare.data?.periodA.byCategory && compare.data?.periodB.byCategory && (compare.data.periodA.byCategory.length > 0 || compare.data.periodB.byCategory.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Desglose por categoría</CardTitle>
            <CardDescription>Ingresos por categoría en cada período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Periodo A</h4>
                <div style={{ height: 300 }}>
                  <AutoSizer>
                    {({ height, width }) => (
                      <List height={height} width={width} itemCount={compare.data!.periodA.byCategory!.length} itemSize={36}>
                        {(props: { index: number; style: React.CSSProperties }) => (
                          <div key={props.index} style={props.style} className="flex justify-between px-2">
                            <span>{compare.data!.periodA.byCategory![props.index].category}</span>
                            <span>{formatCurrency(compare.data!.periodA.byCategory![props.index].revenue)}</span>
                          </div>
                        )}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Periodo B</h4>
                <div style={{ height: 300 }}>
                  <AutoSizer>
                    {({ height, width }) => (
                      <List height={height} width={width} itemCount={compare.data!.periodB.byCategory!.length} itemSize={36}>
                        {(props: { index: number; style: React.CSSProperties }) => (
                          <div key={props.index} style={props.style} className="flex justify-between px-2">
                            <span>{compare.data!.periodB.byCategory![props.index].category}</span>
                            <span>{formatCurrency(compare.data!.periodB.byCategory![props.index].revenue)}</span>
                          </div>
                        )}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {opts.dimension === 'category' && (
        (!compare.data?.periodA.byCategory || !compare.data?.periodB.byCategory || ((compare.data.periodA.byCategory.length === 0) && (compare.data.periodB.byCategory.length === 0))) && (
          <Card>
            <CardHeader>
              <CardTitle>Desglose por categoría</CardTitle>
              <CardDescription>Sin datos para los períodos seleccionados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Ajusta los filtros o rangos de fechas para ver información.</div>
            </CardContent>
          </Card>
        )
      )}

      {opts.dimension === 'product' && compare.data?.periodA.byProduct && compare.data?.periodB.byProduct && (compare.data.periodA.byProduct.length > 0 || compare.data.periodB.byProduct.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Desglose por producto</CardTitle>
            <CardDescription>Ingresos y cantidades por producto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Periodo A</h4>
                <div style={{ height: 300 }}>
                  <AutoSizer>
                    {({ height, width }) => (
                      <List height={height} width={width} itemCount={compare.data!.periodA.byProduct!.length} itemSize={36}>
                        {(props: { index: number; style: React.CSSProperties }) => (
                          <div key={props.index} style={props.style} className="flex justify-between px-2">
                            <span>{compare.data!.periodA.byProduct![props.index].name}</span>
                            <span>{formatCurrency(compare.data!.periodA.byProduct![props.index].revenue)} • {compare.data!.periodA.byProduct![props.index].quantity}u</span>
                          </div>
                        )}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Periodo B</h4>
                <div style={{ height: 300 }}>
                  <AutoSizer>
                    {({ height, width }) => (
                      <List height={height} width={width} itemCount={compare.data!.periodB.byProduct!.length} itemSize={36}>
                        {(props: { index: number; style: React.CSSProperties }) => (
                          <div key={props.index} style={props.style} className="flex justify-between px-2">
                            <span>{compare.data!.periodB.byProduct![props.index].name}</span>
                            <span>{formatCurrency(compare.data!.periodB.byProduct![props.index].revenue)} • {compare.data!.periodB.byProduct![props.index].quantity}u</span>
                          </div>
                        )}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {opts.dimension === 'product' && (
        (!compare.data?.periodA.byProduct || !compare.data?.periodB.byProduct || ((compare.data.periodA.byProduct.length === 0) && (compare.data.periodB.byProduct.length === 0))) && (
          <Card>
            <CardHeader>
              <CardTitle>Desglose por producto</CardTitle>
              <CardDescription>Sin datos para los períodos seleccionados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Intenta cambiar la dimensión o los filtros para ver resultados.</div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
};
