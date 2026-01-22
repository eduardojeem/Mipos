'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
  showItemsPerPage?: boolean;
  showInfo?: boolean;
  compact?: boolean;
  maxVisiblePages?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  className,
  showItemsPerPage = true,
  showInfo = true,
  compact = false,
  maxVisiblePages = 7
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const visible = compact ? Math.min(3, maxVisiblePages) : maxVisiblePages;
    
    if (totalPages <= visible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const sidePages = Math.floor((visible - 1) / 2);
      
      if (currentPage <= sidePages + 1) {
        for (let i = 1; i <= visible - 1; i++) {
          pages.push(i);
        }
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - sidePages) {
        pages.push(1, '...');
        for (let i = totalPages - visible + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1, '...');
        for (let i = currentPage - sidePages; i <= currentPage + sidePages; i++) {
          pages.push(i);
        }
        pages.push('...', totalPages);
      }
    }
    
    return pages;
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Siempre renderizar el paginador para mostrar info y selector,
  // deshabilitando controles cuando corresponda.

  return (
    <div className={cn(
      'flex flex-col items-center gap-5 py-6',
      compact && 'gap-2 py-2',
      className
    )}>
      {/* Info section */}
      {showInfo && (
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          Mostrando {startItem.toLocaleString()} - {endItem.toLocaleString()} de {totalItems.toLocaleString()} productos · Página {currentPage} de {totalPages}
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center gap-2" aria-label="Controles de paginación">
        {/* First page button */}
        {!compact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
            className="h-8 w-8 p-0"
            title="Primera página"
            aria-label="Ir a la primera página"
            aria-disabled={!canGoPrevious}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="h-8 w-8 p-0"
          title="Página anterior"
          aria-label="Ir a la página anterior"
          aria-disabled={!canGoPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1" role="navigation" aria-label="Seleccionar página">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    currentPage === page && "bg-primary text-primary-foreground"
                  )}
                  aria-label={`Ir a la página ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
          title="Página siguiente"
          aria-label="Ir a la página siguiente"
          aria-disabled={!canGoNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        {!compact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className="h-8 w-8 p-0"
            title="Última página"
            aria-label="Ir a la última página"
            aria-disabled={!canGoNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Items per page selector */}
      {showItemsPerPage && (
        <div className="flex items-center gap-2 text-sm order-3">
          <span className="text-muted-foreground whitespace-nowrap">
            Productos por página:
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            aria-label="Seleccionar cantidad de productos por página"
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="36">36</SelectItem>
              <SelectItem value="48">48</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default Pagination;
