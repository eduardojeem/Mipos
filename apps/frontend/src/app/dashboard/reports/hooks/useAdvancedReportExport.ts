'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

// Import jspdf-autotable with dynamic import
let autoTable: any = null;
if (typeof window !== 'undefined') {
    import('jspdf-autotable').then((module) => {
        autoTable = module.default;
    });
}

export type ExportFormat = 'pdf' | 'excel' | 'csv';

interface ExportOptions {
    filename?: string;
    title?: string;
    subtitle?: string;
    orientation?: 'portrait' | 'landscape';
    includeMetadata?: boolean;
    includeCharts?: boolean;
    sheetName?: string;
}

interface ColumnDef {
    header: string;
    dataKey: string;
    width?: number;
    format?: 'currency' | 'number' | 'date' | 'text';
}

interface ChartData {
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    title: string;
    labels: string[];
    datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
    }>;
    options?: any;
}

interface ReportSummary {
    totalRecords: number;
    totals?: Record<string, number>;
    averages?: Record<string, number>;
    highlights?: Array<{ label: string; value: string | number }>;
}

export function useAdvancedReportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const { config } = useBusinessConfig();

    /**
     * Genera un gráfico y lo convierte a imagen
     */
    const generateChartImage = async (chartData: ChartData): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('');
                return;
            }

            const chartConfig: ChartConfiguration = {
                type: chartData.type,
                data: {
                    labels: chartData.labels,
                    datasets: chartData.datasets.map(ds => ({
                        ...ds,
                        backgroundColor: ds.backgroundColor || [
                            'rgba(99, 102, 241, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(14, 165, 233, 0.8)',
                            'rgba(168, 85, 247, 0.8)',
                        ],
                        borderColor: ds.borderColor || [
                            'rgba(99, 102, 241, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(251, 146, 60, 1)',
                            'rgba(236, 72, 153, 1)',
                            'rgba(14, 165, 233, 1)',
                            'rgba(168, 85, 247, 1)',
                        ],
                        borderWidth: ds.borderWidth || 2,
                    })),
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        title: {
                            display: true,
                            text: chartData.title,
                            font: {
                                size: 16,
                                weight: 'bold',
                            },
                        },
                    },
                    ...chartData.options,
                },
            };

            const chart = new Chart(ctx, chartConfig);

            // Esperar a que el gráfico se renderice
            setTimeout(() => {
                const imageUrl = canvas.toDataURL('image/png');
                chart.destroy();
                resolve(imageUrl);
            }, 500);
        });
    };

    /**
     * Formatea un valor según su tipo
     */
    const formatCellValue = (value: any, format?: 'currency' | 'number' | 'date' | 'text'): string => {
        if (value === null || value === undefined) return '';

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG'
                }).format(Number(value));
            case 'number':
                return new Intl.NumberFormat('es-PY').format(Number(value));
            case 'date':
                return new Date(value).toLocaleDateString('es-PY');
            default:
                return String(value);
        }
    };

    /**
     * Calcula estadísticas del reporte
     */
    const calculateSummary = (data: any[], columns: ColumnDef[]): ReportSummary => {
        const totals: Record<string, number> = {};
        const averages: Record<string, number> = {};

        columns.forEach(col => {
            if (col.format === 'currency' || col.format === 'number') {
                const values = data.map(row => Number(row[col.dataKey]) || 0);
                totals[col.header] = values.reduce((sum, val) => sum + val, 0);
                averages[col.header] = totals[col.header] / data.length;
            }
        });

        return {
            totalRecords: data.length,
            totals,
            averages,
        };
    };

    /**
     * Exporta a PDF con gráficos profesionales
     */
    const exportToPDFWithCharts = async (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions & { charts?: ChartData[]; summary?: ReportSummary } = {}
    ) => {
        try {
            const {
                filename = 'reporte',
                title = 'Reporte',
                subtitle,
                orientation = 'portrait',
                includeMetadata = true,
                includeCharts = true,
                charts = [],
                summary
            } = options;

            if (!autoTable) {
                const autoTableModule = await import('jspdf-autotable');
                autoTable = autoTableModule.default;
            }

            const doc = new jsPDF({
                orientation,
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let currentY = 20;

            // ============== PORTADA ==============
            if (includeMetadata) {
                // Fondo de encabezado con gradiente simulado
                doc.setFillColor(99, 102, 241);
                doc.rect(0, 0, pageWidth, 40, 'F');

                // Logo/Marca
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(14, 10, 35, 20, 3, 3, 'F');
                doc.setTextColor(99, 102, 241);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                const logoText = config?.businessName?.substring(0, 3).toUpperCase() || 'POS';
                doc.text(logoText, 31.5, 23, { align: 'center' });

                // Información de la empresa
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(config?.businessName || 'Sistema POS', pageWidth - 14, 18, { align: 'right' });

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`Tel: N/A`, pageWidth - 14, 24, { align: 'right' });
                doc.text(`Email: info@pos.com`, pageWidth - 14, 28, { align: 'right' });

                currentY = 50;
            }

            // Título del reporte
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, currentY);
            currentY += 10;

            if (subtitle) {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(subtitle, 14, currentY);
                currentY += 8;
            }

            // Fecha de generación
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            const generatedDate = new Date().toLocaleString('es-PY', {
                dateStyle: 'full',
                timeStyle: 'short'
            });
            doc.text(`Generado: ${generatedDate}`, 14, currentY);
            currentY += 12;

            // ============== RESUMEN EJECUTIVO ==============
            if (summary) {
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(14, currentY, pageWidth - 28, 35, 2, 2, 'F');

                currentY += 8;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('📊 Resumen Ejecutivo', 18, currentY);
                currentY += 8;

                // Estadísticas en grid
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');

                const statsPerRow = 3;
                const statWidth = (pageWidth - 36) / statsPerRow;
                let statX = 18;
                let statY = currentY;

                // Total de registros
                doc.setFont('helvetica', 'bold');
                doc.text('Total de Registros:', statX, statY);
                doc.setFont('helvetica', 'normal');
                doc.text(summary.totalRecords.toString(), statX, statY + 4);
                statX += statWidth;

                // Totales
                let count = 1;
                Object.entries(summary.totals || {}).forEach(([key, value]) => {
                    if (count >= statsPerRow) {
                        statX = 18;
                        statY += 10;
                        count = 0;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.text(`Total ${key}:`, statX, statY);
                    doc.setFont('helvetica', 'normal');
                    doc.text(formatCellValue(value, 'currency'), statX, statY + 4);
                    statX += statWidth;
                    count++;
                });

                currentY += 28;
            }

            // ============== GRÁFICOS ==============
            if (includeCharts && charts.length > 0) {
                for (const chartData of charts) {
                    // Verificar si necesitamos una nueva página
                    if (currentY > pageHeight - 120) {
                        doc.addPage();
                        currentY = 20;
                    }

                    // Generar imagen del gráfico
                    const chartImage = await generateChartImage(chartData);

                    if (chartImage) {
                        // Título del gráfico
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 0, 0);
                        doc.text(chartData.title, 14, currentY);
                        currentY += 8;

                        // Insertar gráfico
                        const chartWidth = pageWidth - 28;
                        const chartHeight = 80;
                        doc.addImage(chartImage, 'PNG', 14, currentY, chartWidth, chartHeight);
                        currentY += chartHeight + 15;
                    }
                }

                // Añadir separador
                if (currentY > pageHeight - 100) {
                    doc.addPage();
                    currentY = 20;
                } else {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(14, currentY, pageWidth - 14, currentY);
                    currentY += 10;
                }
            }

            // ============== TABLA DE DATOS ==============
            if (currentY > pageHeight - 80) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('📋 Datos Detallados', 14, currentY);
            currentY += 10;

            const tableHeaders = columns.map(col => col.header);
            const tableBody = data.map(row =>
                columns.map(col => formatCellValue(row[col.dataKey], col.format))
            );

            autoTable(doc, {
                startY: currentY,
                head: [tableHeaders],
                body: tableBody,
                theme: 'striped',
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    overflow: 'linebreak',
                },
                headStyles: {
                    fillColor: [99, 102, 241],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                columnStyles: columns.reduce((acc, col, index) => {
                    acc[index] = {
                        cellWidth: col.width ? col.width / 3 : 'auto',
                        halign: col.format === 'currency' || col.format === 'number' ? 'right' : 'left'
                    };
                    return acc;
                }, {} as any),
                margin: { top: 35, right: 14, bottom: 30, left: 14 },
                didDrawPage: (data: any) => {
                    // Pie de página profesional
                    const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                    const totalPages = doc.getNumberOfPages();

                    // Línea superior
                    doc.setDrawColor(99, 102, 241);
                    doc.setLineWidth(0.5);
                    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

                    // Fondo del pie
                    doc.setFillColor(248, 250, 252);
                    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

                    // Texto del pie
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.setFont('helvetica', 'normal');
                    doc.text(
                        `${config?.businessName || 'Sistema POS'} | ${generatedDate}`,
                        14,
                        pageHeight - 12
                    );
                    doc.text(
                        `Página ${pageNum} de ${totalPages} | Total: ${tableBody.length} registros`,
                        pageWidth - 14,
                        pageHeight - 12,
                        { align: 'right' }
                    );
                },
            });

            doc.save(`${filename}_${Date.now()}.pdf`);
            return true;
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            return false;
        }
    };

    /**
     * Exporta a Excel con formato mejorado
     */
    const exportToExcel = (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions & { summary?: ReportSummary } = {}
    ) => {
        try {
            const {
                filename = 'reporte',
                title = 'Reporte',
                subtitle,
                sheetName = 'Datos',
                includeMetadata = true,
                summary
            } = options;

            const workbook = XLSX.utils.book_new();
            const sheetData: any[] = [];

            if (includeMetadata) {
                sheetData.push([title]);
                if (subtitle) sheetData.push([subtitle]);
                sheetData.push([`Empresa: ${config?.businessName || 'N/A'}`]);
                sheetData.push([`Generado: ${new Date().toLocaleString('es-PY')}`]);
                sheetData.push([]);
            }

            // Resumen
            if (summary) {
                sheetData.push(['RESUMEN EJECUTIVO']);
                sheetData.push([]);
                sheetData.push(['Total de Registros', summary.totalRecords]);
                sheetData.push([]);

                if (summary.totals) {
                    sheetData.push(['TOTALES']);
                    Object.entries(summary.totals).forEach(([key, value]) => {
                        sheetData.push([key, Number(value)]);
                    });
                    sheetData.push([]);
                }

                if (summary.averages) {
                    sheetData.push(['PROMEDIOS']);
                    Object.entries(summary.averages).forEach(([key, value]) => {
                        sheetData.push([key, Number(value)]);
                    });
                    sheetData.push([]);
                }

                sheetData.push([]);
                sheetData.push(['DATOS DETALLADOS']);
                sheetData.push([]);
            }

            // Encabezados
            sheetData.push(columns.map(col => col.header));

            // Datos
            data.forEach(row => {
                const rowData = columns.map(col => {
                    const value = row[col.dataKey];
                    if (col.format === 'number' || col.format === 'currency') {
                        return Number(value) || 0;
                    }
                    return formatCellValue(value, col.format);
                });
                sheetData.push(rowData);
            });

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            // Anchos de columna
            const colWidths = columns.map(col => ({
                wch: col.width ? col.width / 10 : Math.max(col.header.length, 15)
            }));
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return false;
        }
    };

    /**
     * Exporta a CSV
     */
    const exportToCSV = (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions = {}
    ) => {
        try {
            const { filename = 'reporte', includeMetadata = true } = options;

            const rows: string[][] = [];

            if (includeMetadata) {
                rows.push([`"${config?.businessName || 'Empresa'}"`]);
                rows.push([`"Generado: ${new Date().toLocaleString('es-PY')}"`]);
                rows.push([]);
            }

            rows.push(columns.map(col => `"${col.header}"`));

            data.forEach(row => {
                const rowData = columns.map(col => {
                    const value = formatCellValue(row[col.dataKey], col.format);
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
                rows.push(rowData);
            });

            const csvContent = rows.map(row => row.join(',')).join('\n');
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}_${Date.now()}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            return true;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return false;
        }
    };

    /**
     * Función principal de exportación con gráficos
     */
    const exportReport = async (
        data: any[],
        format: ExportFormat,
        options: ExportOptions & {
            columns: ColumnDef[];
            charts?: ChartData[];
            summary?: ReportSummary;
        }
    ) => {
        setIsExporting(true);

        try {
            const { columns, charts, summary: providedSummary } = options;

            if (!columns || columns.length === 0) {
                throw new Error('Se requieren columnas para la exportación');
            }

            if (!data || data.length === 0) {
                throw new Error('No hay datos para exportar');
            }

            // Calcular resumen si no se proporciona
            const summary = providedSummary || calculateSummary(data, columns);

            let success = false;

            switch (format) {
                case 'excel':
                    success = exportToExcel(data, columns, { ...options, summary });
                    break;
                case 'csv':
                    success = exportToCSV(data, columns, options);
                    break;
                case 'pdf':
                    success = await exportToPDFWithCharts(data, columns, {
                        ...options,
                        charts,
                        summary
                    });
                    break;
                default:
                    throw new Error(`Formato no soportado: ${format}`);
            }

            if (success) {
                toast({
                    title: '✅ Exportación exitosa',
                    description: `Reporte exportado en formato ${format.toUpperCase()} ${charts && charts.length > 0 ? 'con gráficos' : ''
                        }`,
                    duration: 3000,
                });
            } else {
                throw new Error('Error al exportar el reporte');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: '❌ Error al exportar',
                description: error instanceof Error ? error.message : 'No se pudo exportar el reporte',
                variant: 'destructive',
                duration: 5000,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return {
        exportReport,
        isExporting,
        calculateSummary,
    };
}