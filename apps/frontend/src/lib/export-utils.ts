// Optimized export utilities with lazy loading for bundle optimization
// Reduces initial bundle size by ~1.2MB by loading heavy libraries only when needed

interface Sale {
  id: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: string;
  date: string;
  notes?: string;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  dateRange: {
    from: string;
    to: string;
  };
  includeFields: string[];
  groupBy?: string;
  summary: boolean;
  filters: {
    paymentMethod?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

export class SalesExporter {
  private sales: Sale[];
  private options: ExportOptions;

  constructor(sales: Sale[], options: ExportOptions) {
    this.sales = sales;
    this.options = options;
  }

  private filterSales(): Sale[] {
    let filtered = [...this.sales];

    // Filtrar por rango de fechas
    if (this.options.dateRange.from) {
      filtered = filtered.filter(sale => sale.date >= this.options.dateRange.from);
    }
    if (this.options.dateRange.to) {
      filtered = filtered.filter(sale => sale.date <= this.options.dateRange.to);
    }

    // Filtrar por método de pago
    if (this.options.filters.paymentMethod) {
      filtered = filtered.filter(sale => sale.paymentMethod === this.options.filters.paymentMethod);
    }

    // Filtrar por estado
    if (this.options.filters.status) {
      filtered = filtered.filter(sale => sale.status === this.options.filters.status);
    }

    // Filtrar por monto
    if (this.options.filters.minAmount !== undefined) {
      filtered = filtered.filter(sale => sale.total >= this.options.filters.minAmount!);
    }
    if (this.options.filters.maxAmount !== undefined) {
      filtered = filtered.filter(sale => sale.total <= this.options.filters.maxAmount!);
    }

    return filtered;
  }

  private prepareData(): any[] {
    const filteredSales = this.filterSales();
    
    return filteredSales.map(sale => {
      const row: any = {};
      
      this.options.includeFields.forEach(field => {
        switch (field) {
          case 'id':
            row['ID'] = sale.id;
            break;
          case 'customer':
            row['Cliente'] = sale.customer;
            break;
          case 'items':
            row['Items'] = sale.items;
            break;
          case 'total':
            row['Total'] = sale.total;
            break;
          case 'paymentMethod':
            row['Método de Pago'] = sale.paymentMethod;
            break;
          case 'status':
            row['Estado'] = sale.status;
            break;
          case 'date':
            row['Fecha'] = new Date(sale.date).toLocaleDateString('es-ES');
            break;
          case 'notes':
            row['Notas'] = sale.notes || '';
            break;
        }
      });
      
      return row;
    });
  }

  private generateSummary(): any {
    const filteredSales = this.filterSales();
    
    const summary = {
      totalSales: filteredSales.length,
      totalAmount: filteredSales.reduce((sum, sale) => sum + sale.total, 0),
      averageAmount: filteredSales.length > 0 ? filteredSales.reduce((sum, sale) => sum + sale.total, 0) / filteredSales.length : 0,
      paymentMethods: {} as Record<string, number>,
      statuses: {} as Record<string, number>
    };

    // Contar métodos de pago
    filteredSales.forEach(sale => {
      summary.paymentMethods[sale.paymentMethod] = (summary.paymentMethods[sale.paymentMethod] || 0) + 1;
    });

    // Contar estados
    filteredSales.forEach(sale => {
      summary.statuses[sale.status] = (summary.statuses[sale.status] || 0) + 1;
    });

    return summary;
  }

  // OPTIMIZED: Lazy load XLSX (~800KB) only when needed
  async exportToExcel(): Promise<void> {
    const XLSX = await import('xlsx');
    
    const data = this.prepareData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    // Agregar hoja de resumen si está habilitado
    if (this.options.summary) {
      const summary = this.generateSummary();
      const summaryData = [
        { Métrica: 'Total de Ventas', Valor: summary.totalSales },
        { Métrica: 'Monto Total', Valor: `${summary.totalAmount.toFixed(2)}` },
        { Métrica: 'Promedio por Venta', Valor: `${summary.averageAmount.toFixed(2)}` },
        { Métrica: '', Valor: '' },
        { Métrica: 'Métodos de Pago', Valor: '' },
        ...Object.entries(summary.paymentMethods).map(([method, count]) => ({
          Métrica: method,
          Valor: count
        })),
        { Métrica: '', Valor: '' },
        { Métrica: 'Estados', Valor: '' },
        ...Object.entries(summary.statuses).map(([status, count]) => ({
          Métrica: status,
          Valor: count
        }))
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
    }

    const fileName = `ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // OPTIMIZED: Lazy load XLSX for CSV export
  async exportToCSV(): Promise<void> {
    const XLSX = await import('xlsx');
    
    const data = this.prepareData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    // Prepend BOM to improve Excel compatibility with UTF-8
    const bom = '\ufeff';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // OPTIMIZED: Lazy load jsPDF (~400KB) only when needed
  async exportToPDF(): Promise<void> {
    const [jsPDF] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const data = this.prepareData();
    const doc = new jsPDF.default();

    // Título
    doc.setFontSize(20);
    doc.text('Reporte de Ventas', 14, 22);
    
    // Fecha del reporte
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 32);
    
    // Filtros aplicados
    let yPosition = 42;
    if (this.options.dateRange.from || this.options.dateRange.to) {
      const dateRange = `Período: ${this.options.dateRange.from || 'Inicio'} - ${this.options.dateRange.to || 'Fin'}`;
      doc.text(dateRange, 14, yPosition);
      yPosition += 10;
    }

    // Tabla de datos
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row => headers.map(header => row[header]));

    (doc as any).autoTable({
      head: [headers],
      body: rows,
      startY: yPosition + 10,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Resumen si está habilitado
    if (this.options.summary) {
      const summary = this.generateSummary();
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.text('Resumen', 14, finalY);
      
      const summaryData = [
        ['Total de Ventas', summary.totalSales.toString()],
        ['Monto Total', `${summary.totalAmount.toFixed(2)}`],
        ['Promedio por Venta', `${summary.averageAmount.toFixed(2)}`]
      ];

      (doc as any).autoTable({
        body: summaryData,
        startY: finalY + 10,
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });
    }

    const fileName = `ventas_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  async export(): Promise<void> {
    switch (this.options.format) {
      case 'excel':
        await this.exportToExcel();
        break;
      case 'csv':
        await this.exportToCSV();
        break;
      case 'pdf':
        await this.exportToPDF();
        break;
      default:
        throw new Error(`Formato no soportado: ${this.options.format}`);
    }
  }
}

// OPTIMIZED: Async export function
export const exportSales = async (sales: Sale[], options: ExportOptions): Promise<void> => {
  const exporter = new SalesExporter(sales, options);
  await exporter.export();
};

/**
 * Generic CSV Export
 */
export const exportCSV = async (data: Record<string, unknown>[], filename: string): Promise<void> => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  const bom = '\ufeff';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generic Excel Export
 */
export const exportExcel = async (data: Record<string, unknown>[], filename: string, sheetName: string = 'Data'): Promise<void> => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
