import { useToast } from '@/components/ui/use-toast';
import { createLogger } from '@/lib/logger';
import { useAdvancedReportExport, ExportFormat } from './useAdvancedReportExport';
import { ReportType } from '../page';
import { SalesData, InventoryData, CustomerData, FinancialData, ReportFilters } from './useOptimizedReportData';

const logger = createLogger('ReportsExportHandler');

interface ExportHandlerProps {
  activeTab: ReportType;
  appliedFilters: ReportFilters;
  currentReportData: SalesData | InventoryData | CustomerData | FinancialData | undefined | null;
}

export function useReportsExportHandler({ activeTab, appliedFilters, currentReportData }: ExportHandlerProps) {
  const { toast } = useToast();
  const { exportReport, isExporting } = useAdvancedReportExport();

  const handleExport = async (format: ExportFormat) => {
    if (!currentReportData) {
      const reportNames = {
        sales: 'ventas',
        inventory: 'productos en inventario',
        customers: 'clientes',
        financial: 'datos financieros',
      };

      toast({
        title: `📊 No hay ${reportNames[activeTab]} para exportar`,
        description: `No se encontraron ${reportNames[activeTab]} para el período seleccionado. Intenta ajustar los filtros de fecha o verifica que haya datos registrados.`,
        variant: 'destructive',
        duration: 5000,
      });
      return;
    }

    try {
      if (activeTab === 'sales') {
        const reportData = currentReportData as SalesData;
        const exportData = reportData.topProducts || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Ventas por Fecha',
            labels:
              reportData.salesByDate?.map((item) =>
                new Date(item.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
              ) || [],
            datasets: [
              {
                label: 'Ventas (₲)',
                data: reportData.salesByDate?.map((item) => item.sales) || [],
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgba(99, 102, 241, 1)',
              },
            ],
          },
          {
            type: 'pie' as const,
            title: 'Ventas por Categoría',
            labels: reportData.salesByCategory?.map((item) => item.category) || [],
            datasets: [
              {
                label: 'Ventas',
                data: reportData.salesByCategory?.map((item) => item.sales) || [],
              },
            ],
          },
        ];

        await exportReport(exportData, format, {
          filename: `ventas-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Ventas',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Producto', dataKey: 'name', width: 200, format: 'text' },
            { header: 'Ventas', dataKey: 'sales', width: 120, format: 'currency' },
            { header: 'Cantidad', dataKey: 'quantity', width: 100, format: 'number' },
          ],
          charts,
          includeCharts: true,
          orientation: 'landscape',
        });
      } else if (activeTab === 'inventory') {
        const reportData = currentReportData as InventoryData;
        const exportData = reportData.stockLevels || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Productos por Categoría',
            labels: reportData.categoryBreakdown?.map((item) => item.category) || [],
            datasets: [
              {
                label: 'Cantidad',
                data: reportData.categoryBreakdown?.map((item) => item.count) || [],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
              },
            ],
          },
        ];

        await exportReport(exportData, format, {
          filename: `inventario-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Inventario',
          subtitle: 'Estado actual del inventario',
          columns: [
            { header: 'Producto', dataKey: 'name', width: 200, format: 'text' },
            { header: 'Stock', dataKey: 'stock', width: 100, format: 'number' },
            { header: 'Estado', dataKey: 'status', width: 100, format: 'text' },
          ],
          charts,
          includeCharts: true,
        });
      } else if (activeTab === 'customers') {
        const reportData = currentReportData as CustomerData;
        const exportData = reportData.topCustomers || [];
        const charts = [
          {
            type: 'pie' as const,
            title: 'Segmentos de Clientes',
            labels: reportData.customerSegments?.map((item) => item.segment) || [],
            datasets: [
              {
                label: 'Clientes',
                data: reportData.customerSegments?.map((item) => item.count) || [],
              },
            ],
          },
        ];

        await exportReport(exportData, format, {
          filename: `clientes-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte de Clientes',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Cliente', dataKey: 'name', width: 180, format: 'text' },
            { header: 'Total Gastado', dataKey: 'totalSpent', width: 120, format: 'currency' },
            { header: 'Pedidos', dataKey: 'orders', width: 100, format: 'number' },
          ],
          charts,
          includeCharts: true,
        });
      } else if (activeTab === 'financial') {
        const reportData = currentReportData as FinancialData;
        const exportData = reportData.revenueByMonth || [];
        const charts = [
          {
            type: 'bar' as const,
            title: 'Ingresos vs Gastos',
            labels: reportData.revenueByMonth?.map((item) => item.month) || [],
            datasets: [
              {
                label: 'Ingresos',
                data: reportData.revenueByMonth?.map((item) => item.revenue) || [],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
              },
              {
                label: 'Gastos',
                data: reportData.revenueByMonth?.map((item) => item.expenses) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
              },
            ],
          },
          {
            type: 'pie' as const,
            title: 'Desglose de Gastos',
            labels: reportData.expenseBreakdown?.map((item) => item.category) || [],
            datasets: [
              {
                label: 'Gastos',
                data: reportData.expenseBreakdown?.map((item) => item.amount) || [],
              },
            ],
          },
        ];

        await exportReport(exportData, format, {
          filename: `financiero-${new Date().toISOString().split('T')[0]}`,
          title: 'Reporte Financiero',
          subtitle: `Período: ${appliedFilters.startDate?.toLocaleDateString()} - ${appliedFilters.endDate?.toLocaleDateString()}`,
          columns: [
            { header: 'Período', dataKey: 'month', width: 120, format: 'text' },
            { header: 'Ingresos', dataKey: 'revenue', width: 120, format: 'currency' },
            { header: 'Gastos', dataKey: 'expenses', width: 120, format: 'currency' },
            { header: 'Beneficio', dataKey: 'profit', width: 120, format: 'currency' },
          ],
          charts,
          includeCharts: true,
          orientation: 'landscape',
        });
      }
    } catch (error) {
      logger.error('Error exporting report:', error);
    }
  };

  return { handleExport, isExporting };
}
