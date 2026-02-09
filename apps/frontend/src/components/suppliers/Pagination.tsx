import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    isLoading?: boolean;
}

export function Pagination({
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    isLoading = false,
}: PaginationProps) {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const canGoPrevious = currentPage > 1 && !isLoading;
    const canGoNext = currentPage < totalPages && !isLoading;

    return (
        <div className="flex flex-col items-center justify-between space-y-2 px-2 py-4 sm:flex-row sm:space-y-0">
            <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                    Mostrando <span className="font-medium">{startItem}</span> a{' '}
                    <span className="font-medium">{endItem}</span> de{' '}
                    <span className="font-medium">{totalItems}</span> resultados
                </p>
            </div>

            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Filas por página:</p>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => onPageSizeChange(Number(value))}
                        disabled={isLoading}
                    >
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={pageSize.toString()} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 25, 50, 100].map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center space-x-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(1)}
                            disabled={!canGoPrevious}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                            <span className="sr-only">Primera página</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={!canGoPrevious}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Página anterior</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={!canGoNext}
                        >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Página siguiente</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(totalPages)}
                            disabled={!canGoNext}
                        >
                            <ChevronsRight className="h-4 w-4" />
                            <span className="sr-only">Última página</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
