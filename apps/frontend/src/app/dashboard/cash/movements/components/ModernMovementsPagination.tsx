"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal
} from "lucide-react";
import { motion } from "framer-motion";

interface ModernMovementsPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
}

const PageButton = memo(({ 
  page, 
  isActive, 
  onClick, 
  disabled = false 
}: {
  page: number;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Button
    variant={isActive ? "default" : "outline"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={`min-w-[40px] ${isActive ? 'pointer-events-none' : ''}`}
  >
    {page}
  </Button>
));

PageButton.displayName = "PageButton";

const NavigationButton = memo(({ 
  onClick, 
  disabled, 
  icon: Icon, 
  label 
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ElementType;
  label: string;
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="min-w-[40px]"
    aria-label={label}
  >
    <Icon className="h-4 w-4" />
  </Button>
));

NavigationButton.displayName = "NavigationButton";

export const ModernMovementsPagination = memo<ModernMovementsPaginationProps>(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}) => {
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {totalItems === 0 ? 'No hay elementos' : `${totalItems} elemento${totalItems !== 1 ? 's' : ''}`}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Elementos por página:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      {/* Items info */}
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem} a {endItem} de {totalItems.toLocaleString()} elementos
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Page size selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Por página:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-1">
          <NavigationButton
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1 || isLoading}
            icon={ChevronsLeft}
            label="Primera página"
          />
          
          <NavigationButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
            icon={ChevronLeft}
            label="Página anterior"
          />

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {visiblePages.map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <div className="flex items-center justify-center min-w-[40px] h-9">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <PageButton
                    page={page as number}
                    isActive={page === currentPage}
                    onClick={() => onPageChange(page as number)}
                    disabled={isLoading}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <NavigationButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
            icon={ChevronRight}
            label="Página siguiente"
          />
          
          <NavigationButton
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || isLoading}
            icon={ChevronsRight}
            label="Última página"
          />
        </div>
      </div>
    </motion.div>
  );
});

ModernMovementsPagination.displayName = "ModernMovementsPagination";