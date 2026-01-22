import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export interface ExportOptions {
  filename?: string;
  fields?: string[];
  includeImages?: boolean;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  filters?: any;
  title?: string;
  includeTotals?: boolean;
  applyAutoFilter?: boolean;
  branding?: {
    name?: string;
    logoDataUrl?: string;
    address?: string;
    phone?: string;
  };
}

export interface ExportField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean';
  format?: (value: any) => string;
}

export class ExportService {
  private static readonly DEFAULT_FIELDS: ExportField[] = [
    { key: 'sku', label: 'SKU', type: 'text' },
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'description', label: 'Descripción', type: 'text' },
    { key: 'category', label: 'Categoría', type: 'text' },
    { key: 'supplier', label: 'Proveedor', type: 'text' },
    { key: 'cost_price', label: 'Precio Costo', type: 'currency' },
    { key: 'sale_price', label: 'Precio Venta', type: 'currency' },
    { key: 'stock_quantity', label: 'Stock', type: 'number' },
    { key: 'min_stock', label: 'Stock Mínimo', type: 'number' },
    { key: 'is_active', label: 'Estado', type: 'boolean' },
    { key: 'created_at', label: 'Fecha Creación', type: 'date' },
    { key: 'updated_at', label: 'Última Actualización', type: 'date' }
  ];

  static async exportProducts(
    products: any[],
    format: 'csv' | 'excel' | 'pdf',
    options: ExportOptions = {}
  ): Promise<void> {
    const data = this.prepareExportData(products, options, format === 'excel');
    
    switch (format) {
      case 'csv':
        return this.exportCSV(data, options.filename);
      case 'excel':
        return this.exportExcel(data, options.filename);
      case 'pdf':
        return this.exportPDF(data, options.filename, options);
      default:
        throw new Error(`Formato no soportado: ${format}`);
    }
  }

  private static prepareExportData(products: any[], options: ExportOptions, raw: boolean = false) {
    const fields = options.fields || this.DEFAULT_FIELDS.map(f => f.key);
    const fieldConfigs = this.DEFAULT_FIELDS.filter(f => fields.includes(f.key));
    return products.map(product => {
      const row: Record<string, any> = {};
      fieldConfigs.forEach(field => {
        let value = this.getProductValue(product, field.key);
        if (!raw) {
          switch (field.type) {
            case 'currency':
              value = this.formatCurrency(value);
              break;
            case 'date':
              value = this.formatDate(value);
              break;
            case 'boolean':
              value = value ? 'Sí' : 'No';
              break;
            case 'number':
              value = this.formatNumber(value);
              break;
            default:
              value = String(value || '');
          }
        } else {
          switch (field.type) {
            case 'currency':
            case 'number':
              value = Number(value) || 0;
              break;
            case 'date':
              value = value ? new Date(value) : null;
              break;
            case 'boolean':
              value = Boolean(value);
              break;
            default:
              value = value ?? '';
          }
        }
        row[field.label] = value;
      });
      return row;
    });
  }

  private static getFieldConfigs(options: ExportOptions): ExportField[] {
    const fields = options.fields || this.DEFAULT_FIELDS.map(f => f.key);
    return this.DEFAULT_FIELDS.filter(f => fields.includes(f.key));
  }

  private static getProductValue(product: any, key: string): any {
    switch (key) {
      case 'category':
        return product.category?.name || 'Sin categoría';
      case 'supplier':
        return product.supplier?.name || 'Sin proveedor';
      case 'profit_margin':
        return this.calculateProfitMargin(product);
      case 'total_value':
        return (product.sale_price || 0) * (product.stock_quantity || 0);
      case 'last_sale_date':
        return product.last_sale_date || 'Nunca';
      default:
        return product[key];
    }
  }

  private static calculateProfitMargin(product: any): number {
    const salePrice = product.sale_price || 0;
    const costPrice = product.cost_price || 0;
    
    if (costPrice === 0) return 0;
    return ((salePrice - costPrice) / salePrice) * 100;
  }

  private static formatCurrency(value: any): string {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(num);
  }

  private static formatDate(value: any): string {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('es-PY');
  }

  private static formatNumber(value: any): string {
    const num = Number(value) || 0;
    return num.toLocaleString('es-PY');
  }

  private static exportCSV(data: any[], filename?: string) {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = String(row[header] || '');
          // Escape quotes and wrap in quotes if contains comma
          return value.includes(',') || value.includes('"') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    this.downloadFile(blob, filename || `productos_${Date.now()}.csv`);
  }

  private static async exportExcel(data: any[], filename?: string) {
    if (!data.length) return;
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const headers = Object.keys(data[0]);
    const columnWidths = headers.map((header, idx) => {
      const maxLen = Math.max(
        header.length,
        ...data.map(row => String(row[header] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen, 12), 40) };
    });
    worksheet['!cols'] = columnWidths;
    

    if (data.length) {
      const headers = Object.keys(data[0]);
      if (headers.length) {
        const totals: Record<string, number> = {};
        const labelMap: Record<string, ExportField> = {};
        this.DEFAULT_FIELDS.forEach(f => { labelMap[f.label] = f; });
        headers.forEach(h => {
          const f = labelMap[h];
          if (f && (f.type === 'number' || f.type === 'currency')) {
            totals[h] = data.reduce((sum, row) => sum + (Number(row[h]) || 0), 0);
          }
        });
        if (Object.keys(totals).length) {
          const totalsRow: any = {};
          headers.forEach((h, i) => {
            if (i === 0) totalsRow[h] = 'Totales'; else totalsRow[h] = totals[h] ?? '';
          });
          XLSX.utils.sheet_add_json(worksheet, [totalsRow], { origin: -1 });
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');
    
    const metadata = [
      { Campo: 'Fecha de exportación', Valor: new Date().toLocaleString('es-PY') },
      { Campo: 'Total de productos', Valor: data.length },
      { Campo: 'Formato', Valor: 'Excel (.xlsx)' }
    ];
    const filtersMeta: any[] = [];
    const opts: ExportOptions = { } as any;
    const metadataSheet = XLSX.utils.json_to_sheet(metadata.concat(filtersMeta));
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Información');

    const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
    const labelMap: Record<string, ExportField> = {};
    this.DEFAULT_FIELDS.forEach(f => { labelMap[f.label] = f; });
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const header = headers[C];
      const field = labelMap[header];
      if (!field) continue;
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr];
        if (!cell) continue;
        if (field.type === 'currency') cell.z = '#,##0';
        if (field.type === 'number') cell.z = '#,##0';
        if (field.type === 'date' && cell.v instanceof Date) cell.z = 'dd/mm/yyyy';
      }
    }

    if (worksheet['!ref']) {
      const headerRef = `A1:${XLSX.utils.encode_col(headers.length - 1)}1`;
      worksheet['!autofilter'] = { ref: headerRef } as any;
    }

    if (filename && filename.toLowerCase().endsWith('.xlsx')) {
    }
    
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    this.downloadFile(blob, filename || `productos_${Date.now()}.xlsx`);
  }

  private static exportPDF(data: any[], filename?: string, options?: ExportOptions) {
    if (!data.length) return;
    
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    const title = options?.title || 'Reporte de Productos';
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-PY')}`, 20, 30);
    doc.text(`Total de productos: ${data.length}`, 20, 35);
    if (options?.branding?.name) {
      doc.text(String(options.branding.name), 200, 20);
    }
    if (options?.branding?.logoDataUrl) {
      try { doc.addImage(options.branding.logoDataUrl, 'PNG', 260, 10, 30, 15); } catch {}
    }
    
    const headers = Object.keys(data[0]);
    const body = data.map(row => Object.values(row));
    let foot: any[] | undefined;
    if (options?.includeTotals) {
      const totals: any[] = headers.map((h, i) => {
        if (i === 0) return 'Totales';
        const field = this.DEFAULT_FIELDS.find(f => f.label === h);
        if (field && (field.type === 'number' || field.type === 'currency')) {
          const sum = data.reduce((acc, r) => acc + (Number(r[h]) || 0), 0);
          return this.formatNumber(sum);
        }
        return '';
      });
      foot = [totals];
    }
    (doc as any).autoTable({
      head: [headers],
      body,
      foot,
      startY: 45,
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [245, 245, 245] 
      },
      margin: { top: 45, right: 20, bottom: 20, left: 20 },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    doc.save(filename || `productos_${Date.now()}.pdf`);
  }

  private static downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Template exports for specific use cases
  static async exportInventoryReport(products: any[], options?: ExportOptions): Promise<void> {
    const inventoryFields = [
      'sku', 'name', 'category', 'stock_quantity', 'min_stock', 
      'cost_price', 'sale_price', 'total_value'
    ];
    
    return this.exportProducts(products, 'excel', {
      fields: inventoryFields,
      filename: `inventario_${new Date().toISOString().split('T')[0]}.xlsx`,
      ...options,
    });
  }

  static async exportLowStockReport(products: any[], options?: ExportOptions): Promise<void> {
    const lowStockProducts = products.filter(p => {
      const stock = p.stock_quantity || 0;
      const minStock = p.min_stock || 0;
      return stock <= minStock;
    });
    
    const fields = [
      'sku', 'name', 'category', 'stock_quantity', 'min_stock', 'supplier'
    ];
    
    return this.exportProducts(lowStockProducts, 'pdf', {
      fields,
      filename: `stock_bajo_${new Date().toISOString().split('T')[0]}.pdf`,
      ...options,
    });
  }

  static async exportPriceList(products: any[], options?: ExportOptions): Promise<void> {
    const priceFields = [
      'sku', 'name', 'category', 'cost_price', 'sale_price', 'profit_margin'
    ];
    
    return this.exportProducts(products, 'excel', {
      fields: priceFields,
      filename: `lista_precios_${new Date().toISOString().split('T')[0]}.xlsx`,
      ...options,
    });
  }

  static async exportCatalog(products: any[], options?: ExportOptions): Promise<void> {
    const catalogFields = [
      'sku', 'name', 'description', 'category', 'sale_price', 'is_active'
    ];
    
    return this.exportProducts(products, 'pdf', {
      fields: catalogFields,
      filename: `catalogo_${new Date().toISOString().split('T')[0]}.pdf`,
      ...options,
    });
  }

  // Get available export fields
  static getAvailableFields(): ExportField[] {
    return [...this.DEFAULT_FIELDS];
  }

  // Validate export options
  static validateExportOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (options.fields) {
      const availableFields = this.DEFAULT_FIELDS.map(f => f.key);
      const invalidFields = options.fields.filter(f => !availableFields.includes(f));
      
      if (invalidFields.length > 0) {
        errors.push(`Campos inválidos: ${invalidFields.join(', ')}`);
      }
    }
    
    if (options.dateRange) {
      const { from, to } = options.dateRange;
      if (from && to && from > to) {
        errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
