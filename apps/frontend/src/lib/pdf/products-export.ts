import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product } from '@/types';

interface ColumnConfig {
  sku: boolean;
  name: boolean;
  category: boolean;
  salePrice: boolean;
  costPrice: boolean;
  margin: boolean;
  stock: boolean;
  visibility: boolean;
  status: boolean;
  images: boolean;
  description: boolean;
  brand: boolean;
}

interface ExportOptions {
  title?: string;
  includeStats?: boolean;
  columns?: ColumnConfig;
  stats?: {
    total: number;
    totalValue: number;
    inStock: number;
    lowStock: number;
  };
}

export async function exportProductsToPdf(
  products: Product[],
  options: ExportOptions = {}
) {
  const {
    title = 'Catálogo de Productos',
    includeStats = true,
    columns = {
      sku: true,
      name: true,
      category: true,
      salePrice: true,
      costPrice: true,
      margin: true,
      stock: true,
      visibility: true,
      status: true,
      images: false,
      description: false,
      brand: false,
    },
    stats,
  } = options;

  if (products.length === 0) {
    throw new Error('No hay productos para exportar');
  }

  // Crear documento
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let currentY = margin;

  // Header con decoración
  const headerGradient = doc.setFillColor(30, 41, 59); // slate-900
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 15);

  // Fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  const today = new Date().toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Generado: ${today}`, pageWidth - margin, 15, { align: 'right' });

  currentY = 38;

  // Estadísticas (opcional)
  if (includeStats && stats) {
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen', margin, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const statsWidth = (pageWidth - 2 * margin) / 4;

    // Stat boxes
    const statBoxes = [
      { label: 'Total', value: stats.total },
      { label: 'En Stock', value: stats.inStock },
      { label: 'Stock Bajo', value: stats.lowStock },
      { label: 'Valor Total', value: `Gs ${stats.totalValue.toLocaleString('es-PY')}` },
    ];

    statBoxes.forEach((stat, idx) => {
      const x = margin + idx * statsWidth;
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, currentY, statsWidth - 2, 15);
      doc.setTextColor(100, 116, 139);
      doc.text(stat.label, x + 3, currentY + 5);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(String(stat.value), x + 3, currentY + 11);
      doc.setFont('helvetica', 'normal');
    });

    currentY += 22;
  }

  // Construir columnas dinámicamente
  const tableHeaders: string[] = [];
  const columnWidths: Record<string, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {};
  let widthIndex = 0;

  if (columns.sku) {
    tableHeaders.push('SKU');
    columnWidths[widthIndex.toString()] = { cellWidth: 15 };
    widthIndex++;
  }
  if (columns.name) {
    tableHeaders.push('Producto');
    columnWidths[widthIndex.toString()] = { cellWidth: 35 };
    widthIndex++;
  }
  if (columns.brand) {
    tableHeaders.push('Marca');
    columnWidths[widthIndex.toString()] = { cellWidth: 20 };
    widthIndex++;
  }
  if (columns.category) {
    tableHeaders.push('Categoría');
    columnWidths[widthIndex.toString()] = { cellWidth: 20 };
    widthIndex++;
  }
  if (columns.salePrice) {
    tableHeaders.push('P. Venta');
    columnWidths[widthIndex.toString()] = { halign: 'right', cellWidth: 15 };
    widthIndex++;
  }
  if (columns.costPrice) {
    tableHeaders.push('P. Costo');
    columnWidths[widthIndex.toString()] = { halign: 'right', cellWidth: 15 };
    widthIndex++;
  }
  if (columns.margin) {
    tableHeaders.push('Margen %');
    columnWidths[widthIndex.toString()] = { halign: 'right', cellWidth: 12 };
    widthIndex++;
  }
  if (columns.stock) {
    tableHeaders.push('Stock');
    columnWidths[widthIndex.toString()] = { halign: 'center', cellWidth: 12 };
    widthIndex++;
  }
  if (columns.visibility) {
    tableHeaders.push('Visibilidad');
    columnWidths[widthIndex.toString()] = { halign: 'center', cellWidth: 15 };
    widthIndex++;
  }
  if (columns.status) {
    tableHeaders.push('Estado');
    columnWidths[widthIndex.toString()] = { halign: 'center', cellWidth: 12 };
    widthIndex++;
  }
  if (columns.description) {
    tableHeaders.push('Descripción');
    columnWidths[widthIndex.toString()] = { cellWidth: 30 };
    widthIndex++;
  }

  // Tabla de productos
  const tableData = products.map((product) => {
    const row: (string | number)[] = [];
    const salePrice = product.sale_price || 0;
    const costPrice = product.cost_price || 0;
    const margin = costPrice > 0 ? Math.round(((salePrice - costPrice) / salePrice) * 100) : 0;

    if (columns.sku) row.push(product.sku || '—');
    if (columns.name) row.push(product.name || '—');
    if (columns.brand) row.push(product.brand || '—');
    if (columns.category) {
      row.push(typeof product.category === 'object' ? product.category?.name || '—' : '—');
    }
    if (columns.salePrice) row.push(`Gs ${salePrice.toLocaleString('es-PY')}`);
    if (columns.costPrice) row.push(`Gs ${costPrice.toLocaleString('es-PY')}`);
    if (columns.margin) row.push(`${margin}%`);
    if (columns.stock) row.push(product.stock_quantity || 0);
    if (columns.visibility) row.push(product.is_public ? 'Público' : 'Privado');
    if (columns.status) row.push(product.is_active ? 'Activo' : 'Inactivo');
    if (columns.description) row.push((product.description || '').substring(0, 50));

    return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    margin: margin,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [51, 65, 85], // slate-700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: columnWidths as any,
    didDrawPage: () => {
      // Footer
      const pageCount = (doc as any).internal.pages.length - 1;
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Página ${currentPage} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  // Generar nombre del archivo
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `productos-${timestamp}.pdf`;

  // Descargar
  doc.save(filename);
}
