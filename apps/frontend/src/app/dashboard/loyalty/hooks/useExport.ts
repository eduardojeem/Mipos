import { useCallback } from 'react';
import { DataExporter, filterByColumns, generateFilename } from '../utils/export';
import { toast } from '@/lib/toast';

interface ExportOptions {
  format: 'csv' | 'json';
  columns?: Record<string, boolean>;
  filename?: string;
}

export function useExport() {
  const exportData = useCallback(
    (data: any[], prefix: string, options: ExportOptions) => {
      try {
        const { format, columns, filename } = options;
        
        // Filtrar columnas si se especifican
        const filteredData = columns 
          ? filterByColumns(data, columns)
          : data;

        // Generar nombre de archivo
        const finalFilename = filename || generateFilename(prefix, format);

        // Exportar
        DataExporter.export(
          filteredData,
          finalFilename,
          format,
          columns ? Object.keys(columns).filter(k => columns[k]) : undefined
        );

        toast({
          title: 'Exportación exitosa',
          description: `Archivo ${finalFilename} descargado correctamente`,
        });
      } catch (error: any) {
        console.error('[Export] Error:', error);
        toast({
          title: 'Error al exportar',
          description: error.message || 'No se pudo exportar los datos',
          variant: 'destructive',
        });
      }
    },
    []
  );

  const exportAnalytics = useCallback(
    (
      pointsIssuedByMonth: any[],
      rewardsRedeemedByMonth: any[],
      format: 'csv' | 'json',
      columns?: Record<string, boolean>
    ) => {
      const months = Array.from(
        new Set([
          ...pointsIssuedByMonth.map((x) => x.month),
          ...rewardsRedeemedByMonth.map((x) => x.month),
        ])
      ).sort();

      const data = months.map((month) => ({
        month,
        pointsIssued: Number(
          (pointsIssuedByMonth.find((x) => x.month === month) || {}).points || 0
        ),
        rewardsRedeemed: Number(
          (rewardsRedeemedByMonth.find((x) => x.month === month) || {}).count || 0
        ),
      }));

      exportData(data, 'loyalty_analytics', { format, columns });
    },
    [exportData]
  );

  const exportHistory = useCallback(
    (
      transactions: any[],
      format: 'csv' | 'json',
      columns?: Record<string, boolean>
    ) => {
      const data = transactions.map((t) => ({
        createdAt: t.createdAt,
        type: t.type,
        points: t.points,
        description: t.description,
      }));

      exportData(data, 'loyalty_history', { format, columns });
    },
    [exportData]
  );

  const exportRewards = useCallback(
    (
      rewards: any[],
      format: 'csv' | 'json',
      columns?: Record<string, boolean>
    ) => {
      const data = rewards.map((r) => ({
        name: r.name,
        description: r.description,
        type: r.type,
        value: r.value,
        pointsCost: r.pointsCost,
        isActive: r.isActive,
        timesRedeemed: r.timesRedeemed,
        expiresAt: r.expiresAt || '',
      }));

      exportData(data, 'loyalty_rewards', { format, columns });
    },
    [exportData]
  );

  const exportCustomersByTier = useCallback(
    (
      customersByTier: any[],
      format: 'csv' | 'json',
      columns?: Record<string, boolean>
    ) => {
      const data = customersByTier.map((x) => ({
        tierId: String(x?.tier?.id || ''),
        tierName: String(x?.tier?.name || ''),
        count: Number(x?.count || 0),
      }));

      exportData(data, 'loyalty_customers_by_tier', { format, columns });
    },
    [exportData]
  );

  return {
    exportAnalytics,
    exportHistory,
    exportRewards,
    exportCustomersByTier,
  };
}
