'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className
}: PaginationProps) {
  // Calcular páginas visibles
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Lógica para mostrar páginas con ellipsis
      const halfVisible = Math.floor(maxVisiblePages / 2);
      
      if (currentPage <= halfVisible + 1) {
        // Mostrar desde el inicio
        for (let i = 1; i <= maxVisiblePages - 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfVisible) {
        // Mostrar hacia el final
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Mostrar en el medio
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={cn('flex items-center justify-center space-x-1', className)}>
      {/* First Page */}
      {showFirstLast && currentPage > 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          className="h-8 w-8 p-0"
        >
          1
        </Button>
      )}

      {/* Previous Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === 'ellipsis' ? (
            <div className="flex h-8 w-8 items-center justify-center">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <Button
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="h-8 w-8 p-0"
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}

      {/* Next Page */}
      {showPrevNext && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages - 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          className="h-8 w-8 p-0"
        >
          {totalPages}
        </Button>
      )}
    </nav>
  );
}

// Componente de información de paginación
interface PaginationInfoProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  className?: string;
}

export function PaginationInfo({
  currentPage,
  itemsPerPage,
  totalItems,
  className
}: PaginationInfoProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Mostrando {startItem} a {endItem} de {totalItems} resultados
    </div>
  );
}

// Componente de selector de items por página
interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className
}: PageSizeSelectorProps) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-sm text-muted-foreground">Mostrar:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 rounded border border-input bg-background px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">por página</span>
    </div>
  );
}