'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SalesKpisPayload } from '../hooks/useSalesKpis';
import type { TrendPoint } from '../hooks/useSalesTrend';
import type { CategoryBreakdown } from '../hooks/useSalesBreakdown';

interface Props {
  range: string;
  kpis: SalesKpisPayload | null | undefined;
  trend: TrendPoint[];
  breakdown: CategoryBreakdown[];
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function ExportPDFButton({ range, kpis, trend, breakdown }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.width;
      const now = new Date();
      const MARGIN = 14;

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(15, 185, 129); // emerald-500
      doc.rect(0, 0, W, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Ventas', MARGIN, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const rangeLabel: Record<string, string> = {
        today: 'Hoy', yesterday: 'Ayer', '7d': 'Últimos 7 días',
        '30d': 'Últimos 30 días', '90d': 'Últimos 90 días',
        mtd: 'Mes en curso', ytd: 'Año en curso',
      };
      doc.text(`Período: ${rangeLabel[range] ?? range}`, MARGIN, 20);
      doc.text(
        `Generado: ${now.toLocaleDateString('es')} ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`,
        W - MARGIN,
        20,
        { align: 'right' },
      );

      doc.setTextColor(30, 41, 59); // slate-800
      let y = 36;

      // ── KPI Summary ─────────────────────────────────────────────────────
      if (kpis) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Métricas del Período', MARGIN, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Métrica', 'Valor', 'vs Período Anterior']],
          body: [
            ['Ingresos', fmt(kpis.revenue), fmtPct(kpis.revenue_delta_pct)],
            ['Transacciones', kpis.transactions.toLocaleString('es'), fmtPct(kpis.transactions_delta_pct)],
            ['Ticket Promedio', fmt(kpis.avg_ticket), '—'],
            ['Margen Bruto', fmt(kpis.gross_margin), `${kpis.gross_margin_pct}%`],
          ],
          headStyles: { fillColor: [15, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [240, 253, 244] },
          columnStyles: { 2: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 8;

        // ── Payment Breakdown ─────────────────────────────────────────────
        const methods = Object.entries(kpis.payment_breakdown).filter(([, v]) => v && v > 0);
        if (methods.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Métodos de Pago', MARGIN, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Método', 'Monto']],
            body: methods
              .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
              .map(([k, v]) => [METHOD_LABELS[k] ?? k, fmt(v ?? 0)]),
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [239, 246, 255] },
            columnStyles: { 1: { halign: 'right' } },
          });

          y = (doc as any).lastAutoTable.finalY + 8;
        }

        // ── Top Products ──────────────────────────────────────────────────
        if (kpis.top_products_by_revenue.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Top Productos por Ingresos', MARGIN, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['#', 'Producto', 'SKU', 'Uds.', 'Ingresos']],
            body: kpis.top_products_by_revenue.map((p, i) => [
              i + 1,
              p.product_name,
              p.sku ?? '—',
              p.qty.toLocaleString('es'),
              fmt(p.revenue),
            ]),
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 4: { halign: 'right' } },
          });

          y = (doc as any).lastAutoTable.finalY + 8;
        }
      }

      // ── Category Breakdown ───────────────────────────────────────────────
      if (breakdown.length > 0) {
        // New page if less than 50mm left
        if (y > doc.internal.pageSize.height - 50) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Ventas por Categoría', MARGIN, y);
        y += 4;

        const total = breakdown.reduce((s, r) => s + r.revenue, 0);
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Categoría', 'Unidades', 'Ingresos', '% del Total']],
          body: breakdown.map(r => [
            r.category,
            r.units.toLocaleString('es'),
            fmt(r.revenue),
            total > 0 ? `${((r.revenue / total) * 100).toFixed(1)}%` : '—',
          ]),
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [255, 251, 235] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── Daily Trend Table ────────────────────────────────────────────────
      if (trend.length > 0 && trend.length <= 31) {
        if (y > doc.internal.pageSize.height - 50) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalle Diario', MARGIN, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          head: [['Fecha', 'Transacciones', 'Ingresos']],
          body: trend.map(p => [
            new Date(p.day + 'T00:00:00').toLocaleDateString('es'),
            p.transactions.toLocaleString('es'),
            fmt(p.revenue),
          ]),
          headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        });
      }

      // ── Page numbers ─────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${pageCount}`, W / 2, doc.internal.pageSize.height - 6, { align: 'center' });
      }

      doc.save(`ventas-${range}-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('[PDF Export]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading || !kpis}
      className="rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm"
    >
      <FileDown className="h-4 w-4 mr-2" />
      {loading ? 'Generando…' : 'PDF'}
    </Button>
  );
}
