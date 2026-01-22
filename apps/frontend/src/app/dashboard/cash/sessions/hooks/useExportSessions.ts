import { useCallback } from 'react';
import type { CashSession } from '@/types/cash';
import { formatDateTime, formatDate } from '@/lib/date-utils';

/**
 * Hook for exporting cash sessions to CSV
 */
export function useExportSessions() {
    const exportToCSV = useCallback((sessions: CashSession[], filename?: string) => {
        const header = [
            "ID",
            "Estado",
            "Monto Apertura",
            "Monto Cierre",
            "Balance Esperado",
            "Discrepancia",
            "Usuario Apertura",
            "Usuario Cierre",
            "Fecha Apertura",
            "Fecha Cierre",
            "Notas"
        ];

        const rows = sessions.map((s) => [
            s.id.slice(-8),
            s.status,
            String(s.openingAmount),
            s.closingAmount != null ? String(s.closingAmount) : "-",
            s.systemExpected != null ? String(s.systemExpected) : "-",
            s.discrepancyAmount != null ? String(s.discrepancyAmount) : "-",
            s.openedByUser?.fullName || s.openedByUser?.email || "-",
            s.closedByUser?.fullName || s.closedByUser?.email || "-",
            formatDateTime(s.openedAt),
            s.closedAt ? formatDateTime(s.closedAt) : "-",
            s.notes || "-",
        ]);

        const csv = [header, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        // Add BOM for Excel UTF-8 support
        const csvWithBOM = "\ufeff" + csv;
        const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || `sesiones_caja_${formatDate(new Date()).replace(/\//g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    return { exportToCSV };
}
