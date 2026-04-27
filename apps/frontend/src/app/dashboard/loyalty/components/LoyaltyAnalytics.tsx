'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3, Activity } from 'lucide-react';

interface ChartDataPoint {
  month: string;
  value: number;
}

interface LoyaltyAnalyticsProps {
  pointsIssuedByMonth: ChartDataPoint[];
  rewardsRedeemedByMonth: ChartDataPoint[];
  isLoading: boolean;
  startDate: Date;
  endDate: Date;
  selectedProgramId: string;
  programs: Array<{ id: string; name: string }>;
  onStartDateChange: (d: Date) => void;
  onEndDateChange: (d: Date) => void;
  onProgramChange: (id: string) => void;
}

const QUICK_RANGES = [
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '180 días', days: 180 },
  { label: '1 año', days: 365 },
];

function toDateInput(d: Date): string {
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

interface BarChartProps {
  data: ChartDataPoint[];
  color: string;
  label: string;
  isLoading: boolean;
}

function BarChart({ data, color, label, isLoading }: BarChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1" style={{ width: `${30 + i * 15}%` }} />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Sin datos en el período seleccionado</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <TooltipProvider>
      <div className="space-y-2.5">
        {data.map((item, idx) => (
          <Tooltip key={`${item.month}-${idx}`}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-3 group cursor-default">
                <div className="w-16 text-right text-[11px] text-muted-foreground shrink-0">
                  {item.month}
                </div>
                <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all duration-700 ${color} group-hover:brightness-110`}
                    style={{ width: `${Math.max(2, (item.value / maxVal) * 100)}%` }}
                  />
                </div>
                <div className="w-14 text-right text-xs font-semibold tabular-nums shrink-0">
                  {item.value.toLocaleString('es')}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5">
                <div className="font-semibold">{item.month}</div>
                <div>{label}: {item.value.toLocaleString('es')}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function LoyaltyAnalytics({
  pointsIssuedByMonth,
  rewardsRedeemedByMonth,
  isLoading,
  startDate,
  endDate,
  selectedProgramId,
  programs,
  onStartDateChange,
  onEndDateChange,
  onProgramChange,
}: LoyaltyAnalyticsProps) {
  const handleQuickRange = (days: number) => {
    const now = new Date();
    onEndDateChange(now);
    onStartDateChange(new Date(now.getTime() - days * 86400000));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-4">
            {/* Program selector */}
            {programs.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Programa</Label>
                <Select value={selectedProgramId} onValueChange={onProgramChange}>
                  <SelectTrigger className="h-9 w-44 text-sm">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date range */}
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-9 w-36 text-sm"
                value={toDateInput(startDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onStartDateChange(new Date(`${e.target.value}T00:00:00Z`));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-9 w-36 text-sm"
                value={toDateInput(endDate)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onEndDateChange(new Date(`${e.target.value}T23:59:59Z`));
                }}
              />
            </div>

            {/* Quick ranges */}
            <div className="flex items-end gap-1 pb-0.5">
              {QUICK_RANGES.map((r) => (
                <Button
                  key={r.days}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs px-2.5"
                  onClick={() => handleQuickRange(r.days)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Puntos emitidos por mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={pointsIssuedByMonth}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              label="Puntos emitidos"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Recompensas canjeadas por mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={rewardsRedeemedByMonth}
              color="bg-gradient-to-r from-purple-500 to-pink-500"
              label="Recompensas canjeadas"
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
