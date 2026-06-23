import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product } from '@/types';

interface ExportOptions {
  title?: string;
  includeStats?: boolean;
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
  doc.setFont(undefined, 'bold');
  doc.text(title, margin, 15);

  // Fecha
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
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
    doc.setFont(undefined, 'bold');
    doc.text('Resumen', margin, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
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
      doc.setFont(undefined, 'bold');
      doc.text(String(stat.value), x + 3, currentY + 11);
      doc.setFont(undefined, 'normal');
    });

    currentY += 22;
  }

  // Tabla de productos
  const tableData = products.map((product) => [
    product.sku || '—',
    product.name || '—',
    typeof product.category === 'object' ? product.category?.name || '—' : '—',
    `Gs ${(product.sale_price || 0).toLocaleString('es-PY')}`,
    product.stock_quantity || 0,
    product.is_public ? 'Público' : 'Privado',
    product.is_active ? 'Activo' : 'Inactivo',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['SKU', 'Producto', 'Categoría', 'Precio', 'Stock', 'Visibilidad', 'Estado']],
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
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 }, // SKU
      3: { halign: 'right', cellWidth: 20 }, // Precio
      4: { halign: 'center', cellWidth: 12 }, // Stock
      5: { halign: 'center', cellWidth: 18 }, // Visibilidad
      6: { halign: 'center', cellWidth: 15 }, // Estado
    },
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
