'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { useBusinessConfig } from '@/contexts/BusinessConfigContext';

// Import jspdf-autotable with dynamic import to avoid SSR issues
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
    sheetName?: string;
}

interface ColumnDef {
    header: string;
    dataKey: string;
    width?: number;
    format?: 'currency' | 'number' | 'date' | 'text';
}

export function useEnhancedReportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const { config } = useBusinessConfig();

    /**
     * Formatea un valor según su tipo
     */
    const formatCellValue = (value: any, format?: 'currency' | 'number' | 'date' | 'text'): string => {
        if (value === null || value === undefined) return '';

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG' // Usar PYG por defecto
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
     * Exporta a Excel mejorado con formato profesional
     */
    const exportToExcel = (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions = {}
    ) => {
        try {
            const {
                filename = 'reporte',
                title = 'Reporte',
                subtitle,
                sheetName = 'Datos',
                includeMetadata = true
            } = options;

            const workbook = XLSX.utils.book_new();

            // Crear array para la hoja con metadatos
            const sheetData: any[] = [];

            if (includeMetadata) {
                // Título
                sheetData.push([title]);
                if (subtitle) {
                    sheetData.push([subtitle]);
                }
                sheetData.push([`Empresa: ${config?.businessName || 'N/A'}`]);
                sheetData.push([`Generado: ${new Date().toLocaleString('es-PY')}`]);
                sheetData.push([]); // Línea en blanco
            }

            // Encabezados
            const headers = columns.map(col => col.header);
            sheetData.push(headers);

            // Datos formateados
            data.forEach(row => {
                const rowData = columns.map(col => {
                    const value = row[col.dataKey];
                    // Para Excel, mantener números como números
                    if (col.format === 'number' || col.format === 'currency') {
                        return Number(value) || 0;
                    }
                    return formatCellValue(value, col.format);
                });
                sheetData.push(rowData);
            });

            // Crear hoja de cálculo
            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

            // Aplicar estilos y anchos de columna
            const headerRow = includeMetadata ? 5 : 0;

            // Configurar anchos de columna
            const colWidths = columns.map(col => ({
                wch: col.width || Math.max(
                    col.header.length,
                    ...data.map(row => String(row[col.dataKey] || '').length)
                ) + 5
            }));
            worksheet['!cols'] = colWidths;

            // Merge cells para el título
            if (includeMetadata) {
                const range = { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } };
                if (!worksheet['!merges']) worksheet['!merges'] = [];
                worksheet['!merges'].push(range);

                // Estilo para las celdas de título (requiere xlsx-style o similar)
                // Por ahora solo configuramos el worksheet básico
            }

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Agregar hoja de resumen si hay datos
            if (data.length > 0) {
                const summaryData = [
                    ['Resumen del Reporte'],
                    [],
                    ['Total de registros', data.length],
                    ['Fecha generación', new Date().toLocaleString('es-PY')],
                    ['Generado por', config?.businessName || 'Sistema POS']
                ];

                const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
            }

            // Descargar archivo
            XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`);
            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            return false;
        }
    };

    /**
     * Exporta a CSV con BOM UTF-8 para caracteres especiales
     */
    const exportToCSV = (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions = {}
    ) => {
        try {
            const { filename = 'reporte', includeMetadata = true } = options;

            // Crear array de filas
            const rows: string[][] = [];

            if (includeMetadata) {
                rows.push([`"${config?.businessName || 'Empresa'}"`]);
                rows.push([`"Generado: ${new Date().toLocaleString('es-PY')}"`]);
                rows.push([]); // Línea en blanco
            }

            // Encabezados
            rows.push(columns.map(col => `"${col.header}"`));

            // Datos
            data.forEach(row => {
                const rowData = columns.map(col => {
                    const value = formatCellValue(row[col.dataKey], col.format);
                    // Escapar comillas dobles
                    return `"${String(value).replace(/"/g, '""')}"`;
                });
                rows.push(rowData);
            });

            // Convertir a CSV
            const csvContent = rows.map(row => row.join(',')).join('\n');

            // Agregar BOM UTF-8 para correcta visualización en Excel
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], {
                type: 'text/csv;charset=utf-8;'
            });

            // Descargar
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
     * Exporta a PDF profesional con logo y formato mejorado
     */
    const exportToPDF = async (
        data: any[],
        columns: ColumnDef[],
        options: ExportOptions = {}
    ) => {
        try {
            const {
                filename = 'reporte',
                title = 'Reporte',
                subtitle,
                orientation = 'portrait',
                includeMetadata = true
            } = options;

            // Cargar autoTable si aún no está disponible
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

            // Encabezado del documento
            if (includeMetadata) {
                // Logo placeholder (puedes agregar un logo real aquí)
                doc.setFillColor(99, 102, 241); // Indigo
                doc.rect(14, currentY - 5, 30, 15, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text((config?.businessName || 'POS').substring(0, 3).toUpperCase(), 29, currentY + 5, {
                    align: 'center'
                });

                // Información de la empresa
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(config?.businessName || 'Sistema POS', pageWidth - 14, currentY, {
                    align: 'right'
                });
                currentY += 5;
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Tel: ${(config as any)?.phone || 'N/A'} | Email: ${(config as any)?.email || 'info@pos.com'}`,
                    pageWidth - 14,
                    currentY,
                    { align: 'right' }
                );

                currentY += 10;
                // Línea separadora
                doc.setDrawColor(200, 200, 200);
                doc.line(14, currentY, pageWidth - 14, currentY);
                currentY += 10;
            }

            // Título del reporte
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title || 'Reporte', 14, currentY);
            currentY += 8;

            if (subtitle) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(subtitle || '', 14, currentY);
                currentY += 6;
            }

            // Fecha y hora de generación
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text(
                `Generado: ${new Date().toLocaleString('es-PY', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                })}`,
                14,
                currentY
            );
            currentY += 10;

            // Preparar datos para la tabla
            const tableHeaders = columns.map(col => col.header);
            const tableBody = data.map(row =>
                columns.map(col => formatCellValue(row[col.dataKey], col.format))
            );

            // Generar tabla con autoTable
            autoTable(doc, {
                startY: currentY,
                head: [tableHeaders],
                body: tableBody,
                theme: 'striped',
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    overflow: 'linebreak',
                    cellWidth: 'wrap',
                },
                headStyles: {
                    fillColor: [99, 102, 241], // Indigo
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
                margin: { top: 35, right: 14, bottom: 25, left: 14 },
                didDrawPage: (data: any) => {
                    // Pie de página en cada página
                    const pageNumber = doc.internal.pages.length - 1;
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);

                    // Línea superior del pie
                    doc.setDrawColor(200, 200, 200);
                    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

                    // Texto del pie
                    doc.text(
                        `${config?.businessName || 'Sistema POS'} - Página ${pageNumber}`,
                        14,
                        pageHeight - 10
                    );
                    doc.text(
                        `Total registros: ${tableBody.length}`,
                        pageWidth - 14,
                        pageHeight - 10,
                        { align: 'right' }
                    );
                },
            });

            // Descargar PDF
            doc.save(`${filename}_${Date.now()}.pdf`);
            return true;
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            return false;
        }
    };

    /**
     * Función principal de exportación
     */
    const exportReport = async (
        data: any[],
        format: ExportFormat,
        options: ExportOptions & { columns: ColumnDef[] }
    ) => {
        setIsExporting(true);

        try {
            const { filename = 'reporte', columns } = options;

            if (!columns || columns.length === 0) {
                throw new Error('Se requieren columnas para la exportación');
            }

            if (!data || data.length === 0) {
                throw new Error('No hay datos para exportar');
            }

            let success = false;

            switch (format) {
                case 'excel':
                    success = exportToExcel(data, columns, options);
                    break;
                case 'csv':
                    success = exportToCSV(data, columns, options);
                    break;
                case 'pdf':
                    success = await exportToPDF(data, columns, options);
                    break;
                default:
                    throw new Error(`Formato no soportado: ${format}`);
            }

            if (success) {
                toast({
                    title: '✅ Exportación exitosa',
                    description: `El reporte se ha exportado en formato ${format.toUpperCase()}`,
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
    };
}
