'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, File, Loader2 } from 'lucide-react';
import { ExportFormat } from '../hooks/useEnhancedReportExport';
import { cn } from '@/lib/utils';

interface ExportMenuProps {
    onExport: (format: ExportFormat) => void;
    disabled?: boolean;
    loading?: boolean;
    recordCount?: number;
}

export function EnhancedExportMenu({
    onExport,
    disabled = false,
    loading = false,
    recordCount = 0
}: ExportMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled || loading || recordCount === 0}
                    className={cn(
                        "gap-2 border-border/60 dark:border-white/10",
                        "bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/50",
                        "hover:shadow-md transition-all duration-200",
                        "dark:hover:bg-zinc-900 dark:hover:border-white/20"
                    )}
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Exportando...
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4" />
                            Exportar
                            {recordCount > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                    ({recordCount})
                                </span>
                            )}
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className={cn(
                    "w-64 border-border/60 dark:border-white/10",
                    "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
                    "shadow-xl dark:shadow-black/40"
                )}
            >
                <DropdownMenuLabel className="text-sm font-semibold">
                    Formato de exportación
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-white/10" />

                {/* Excel */}
                <DropdownMenuItem
                    onClick={() => onExport('excel')}
                    className={cn(
                        "gap-3 cursor-pointer py-3 px-3",
                        "hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
                        "transition-colors"
                    )}
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                        <FileSpreadsheet className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm text-foreground">
                            Excel
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Formato .xlsx con múltiples hojas
                        </div>
                    </div>
                </DropdownMenuItem>

                {/* CSV */}
                <DropdownMenuItem
                    onClick={() => onExport('csv')}
                    className={cn(
                        "gap-3 cursor-pointer py-3 px-3",
                        "hover:bg-blue-50 dark:hover:bg-blue-950/20",
                        "transition-colors"
                    )}
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                        <File className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm text-foreground">
                            CSV
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Formato .csv compatible con Excel
                        </div>
                    </div>
                </DropdownMenuItem>

                {/* PDF */}
                <DropdownMenuItem
                    onClick={() => onExport('pdf')}
                    className={cn(
                        "gap-3 cursor-pointer py-3 px-3",
                        "hover:bg-red-50 dark:hover:bg-red-950/20",
                        "transition-colors"
                    )}
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                        <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold text-sm text-foreground">
                            PDF
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Documento profesional con logo
                        </div>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="dark:bg-white/10" />

                <div className="p-2 text-xs text-center text-muted-foreground">
                    {recordCount === 0 ? (
                        'No hay datos para exportar'
                    ) : (
                        `${recordCount} ${recordCount === 1 ? 'registro' : 'registros'} disponibles`
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
