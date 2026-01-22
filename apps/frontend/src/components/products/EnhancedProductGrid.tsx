'use client';

import React from 'react';
import { EnhancedProductCard } from './EnhancedProductCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  discount_percentage?: number;
  image?: string;
  images?: string[];
  supplier?: {
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
}

interface EnhancedProductGridProps {
  products: Product[];
  isLoading?: boolean;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onDuplicate?: (product: Product) => void;
  currentPage?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EnhancedProductGrid({
  products,
  isLoading = false,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate,
  currentPage = 1,
  itemsPerPage = 25,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
  canEdit = true,
  canDelete = true
}: EnhancedProductGridProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: itemsPerPage }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-800 rounded-lg h-96"></div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay productos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <EnhancedProductCard
            key={product.id}
            product={product}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onDuplicate={onDuplicate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ))}
      </div>

      {/* Enhanced pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange?.(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>

          {/* Page info */}
          <div className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">{startItem}</span> a{' '}
            <span className="font-medium">{endItem}</span> de{' '}
            <span className="font-medium">{totalItems}</span> productos
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
