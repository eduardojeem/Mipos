'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download } from 'lucide-react';

interface ExportMenuProps {
  analyticsCols: Record<string, boolean>;
  setAnalyticsCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  historyCols: Record<string, boolean>;
  setHistoryCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  rewardsCols: Record<string, boolean>;
  setRewardsCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  tierCols: Record<string, boolean>;
  setTierCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onExportAnalytics: (format: 'csv' | 'json') => void;
  onExportHistory: (format: 'csv' | 'json') => void;
  onExportRewards: (format: 'csv' | 'json') => void;
  onExportCustomersByTier: (format: 'csv' | 'json') => void;
  transactions: any[];
  rewards: any[];
  customersByTier: any[];
  pointsIssuedByMonth: any[];
  rewardsRedeemedByMonth: any[];
}

const analyticsLabels: Record<string, string> = { 
  month: 'Mes', 
  pointsIssued: 'Puntos emitidos', 
  rewardsRedeemed: 'Recompensas canjeadas' 
};

const historyLabels: Record<string, string> = { 
  createdAt: 'Fecha', 
  type: 'Tipo', 
  points: 'Puntos', 
  description: 'Descripción' 
};

const rewardsLabels: Record<string, string> = { 
  name: 'Nombre', 
  description: 'Descripción', 
  type: 'Tipo', 
  value: 'Valor', 
  pointsCost: 'Costo en puntos', 
  isActive: 'Activa', 
  timesRedeemed: 'Veces canjeada', 
  expiresAt: 'Expira' 
};

const tierLabels: Record<string, string> = { 
  tierId: 'ID Nivel', 
  tierName: 'Nombre Nivel', 
  count: 'Clientes' 
};

const colsLabel = (m: Record<string, string>, cols: Record<string, boolean>) => {
  const list = Object.entries(cols).filter(([_, v]) => v).map(([k]) => m[k] || k);
  return list.length ? list.join(', ') : 'Ninguna';
};

export function ExportMenu({
  analyticsCols,
  setAnalyticsCols,
  historyCols,
  setHistoryCols,
  rewardsCols,
  setRewardsCols,
  tierCols,
  setTierCols,
  onExportAnalytics,
  onExportHistory,
  onExportRewards,
  onExportCustomersByTier,
  transactions,
  rewards,
  customersByTier,
  pointsIssuedByMonth,
  rewardsRedeemedByMonth,
}: ExportMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] max-h-[600px] overflow-y-auto">
        <div className="space-y-4">
          {/* Analíticas */}
          <div>
            <div className="text-sm font-medium mb-2">Analíticas</div>
            <div className="flex gap-2 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportAnalytics('csv')}>
                      CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(analyticsLabels, analyticsCols)}</div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportAnalytics('json')}>
                      JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(analyticsLabels, analyticsCols)}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={analyticsCols.month} 
                  onCheckedChange={(v) => setAnalyticsCols((p) => ({ ...p, month: !!v }))} 
                />
                Mes
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={analyticsCols.pointsIssued} 
                  onCheckedChange={(v) => setAnalyticsCols((p) => ({ ...p, pointsIssued: !!v }))} 
                />
                Puntos emitidos
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={analyticsCols.rewardsRedeemed} 
                  onCheckedChange={(v) => setAnalyticsCols((p) => ({ ...p, rewardsRedeemed: !!v }))} 
                />
                Recompensas canjeadas
              </label>
            </div>
            {(() => {
              const issued = pointsIssuedByMonth || [];
              const redeemed = rewardsRedeemedByMonth || [];
              const months = Array.from(new Set([
                ...issued.map((x: any) => x.month),
                ...redeemed.map((x: any) => x.month),
              ])).sort();
              const rowsRaw = months.map((m) => ({
                month: m,
                pointsIssued: Number((issued.find((x: any) => x.month === m) || {}).points || 0),
                rewardsRedeemed: Number((redeemed.find((x: any) => x.month === m) || {}).count || 0),
              }));
              const rows = rowsRaw
                .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => analyticsCols[k])))
                .slice(0, 5);
              const headers = rows.length ? Object.keys(rows[0]) : [];
              return rows.length ? (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Vista previa (5)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={`ah-${h}`}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={`ar-${i}`}>
                          {headers.map((h) => (
                            <TableCell key={`ac-${i}-${h}`}>{String((r as any)[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null;
            })()}
          </div>

          <Separator />

          {/* Historial */}
          <div>
            <div className="text-sm font-medium mb-2">Historial</div>
            <div className="flex gap-2 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportHistory('csv')}>
                      CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(historyLabels, historyCols)}</div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportHistory('json')}>
                      JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(historyLabels, historyCols)}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={historyCols.createdAt} 
                  onCheckedChange={(v) => setHistoryCols((p) => ({ ...p, createdAt: !!v }))} 
                />
                Fecha
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={historyCols.type} 
                  onCheckedChange={(v) => setHistoryCols((p) => ({ ...p, type: !!v }))} 
                />
                Tipo
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={historyCols.points} 
                  onCheckedChange={(v) => setHistoryCols((p) => ({ ...p, points: !!v }))} 
                />
                Puntos
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={historyCols.description} 
                  onCheckedChange={(v) => setHistoryCols((p) => ({ ...p, description: !!v }))} 
                />
                Descripción
              </label>
            </div>
            {(() => {
              const rowsRaw = transactions.map((t) => ({
                createdAt: t.createdAt,
                type: t.type,
                points: t.points,
                description: t.description,
              }));
              const rows = rowsRaw
                .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => historyCols[k])))
                .slice(0, 5);
              const headers = rows.length ? Object.keys(rows[0]) : [];
              return rows.length ? (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Vista previa (5)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={`hh-${h}`}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={`hr-${i}`}>
                          {headers.map((h) => (
                            <TableCell key={`hc-${i}-${h}`}>{String((r as any)[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null;
            })()}
          </div>

          <Separator />

          {/* Recompensas */}
          <div>
            <div className="text-sm font-medium mb-2">Recompensas</div>
            <div className="flex gap-2 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportRewards('csv')}>
                      CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(rewardsLabels, rewardsCols)}</div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportRewards('json')}>
                      JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(rewardsLabels, rewardsCols)}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.name} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, name: !!v }))} 
                />
                Nombre
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.description} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, description: !!v }))} 
                />
                Descripción
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.type} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, type: !!v }))} 
                />
                Tipo
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.value} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, value: !!v }))} 
                />
                Valor
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.pointsCost} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, pointsCost: !!v }))} 
                />
                Costo en puntos
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.isActive} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, isActive: !!v }))} 
                />
                Activa
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.timesRedeemed} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, timesRedeemed: !!v }))} 
                />
                Veces canjeada
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={rewardsCols.expiresAt} 
                  onCheckedChange={(v) => setRewardsCols((p) => ({ ...p, expiresAt: !!v }))} 
                />
                Expira
              </label>
            </div>
            {(() => {
              const rowsRaw = rewards.map((r) => ({
                name: r.name,
                description: r.description,
                type: r.type,
                value: r.value,
                pointsCost: r.pointsCost,
                isActive: r.isActive,
                timesRedeemed: r.timesRedeemed,
                expiresAt: r.expiresAt || '',
              }));
              const rows = rowsRaw
                .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => rewardsCols[k])))
                .slice(0, 5);
              const headers = rows.length ? Object.keys(rows[0]) : [];
              return rows.length ? (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Vista previa (5)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={`rh-${h}`}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={`rr-${i}`}>
                          {headers.map((h) => (
                            <TableCell key={`rc-${i}-${h}`}>{String((r as any)[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null;
            })()}
          </div>

          <Separator />

          {/* Clientes por nivel */}
          <div>
            <div className="text-sm font-medium mb-2">Clientes por nivel</div>
            <div className="flex gap-2 mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportCustomersByTier('csv')}>
                      CSV
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(tierLabels, tierCols)}</div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => onExportCustomersByTier('json')}>
                      JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">Columnas: {colsLabel(tierLabels, tierCols)}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={tierCols.tierId} 
                  onCheckedChange={(v) => setTierCols((p) => ({ ...p, tierId: !!v }))} 
                />
                ID Nivel
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={tierCols.tierName} 
                  onCheckedChange={(v) => setTierCols((p) => ({ ...p, tierName: !!v }))} 
                />
                Nombre Nivel
              </label>
              <label className="flex items-center gap-2">
                <Checkbox 
                  checked={tierCols.count} 
                  onCheckedChange={(v) => setTierCols((p) => ({ ...p, count: !!v }))} 
                />
                Clientes
              </label>
            </div>
            {(() => {
              const src = customersByTier || [];
              const rowsRaw = src.map((x: any) => ({
                tierId: String(x?.tier?.id || ''),
                tierName: String(x?.tier?.name || ''),
                count: Number(x?.count || 0),
              }));
              const rows = rowsRaw
                .map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => tierCols[k])))
                .slice(0, 5);
              const headers = rows.length ? Object.keys(rows[0]) : [];
              return rows.length ? (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Vista previa (5)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={`th-${h}`}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={`tr-${i}`}>
                          {headers.map((h) => (
                            <TableCell key={`tc-${i}-${h}`}>{String((r as any)[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
