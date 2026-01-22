'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  Copy,
  Star,
  StarOff,
  Zap,
  Lock
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { VirtualizedTable } from '@/components/ui/virtualized-table';
import { LoadingButton, OperationState, useOperationState } from '@/components/ui/loading-states';
import { useCurrencyFormatter } from '@/contexts/BusinessConfigContext';

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

interface ProductTableProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onView?: (product: Product) => void;
  onToggleFavorite?: (productId: string) => void;
  onBulkAction?: (action: string, productIds: string[]) => void;
  isLoading?: boolean;
  enableVirtualization?: boolean;
  virtualizationHeight?: number;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems?: number;
  visibleColumns?: { image?: boolean; name?: boolean; code?: boolean; category?: boolean; supplier?: boolean; stock?: boolean; price?: boolean; status?: boolean };
  searchValue?: string;
  onSearchChange?: (term: string) => void;
  imageFilterValue?: 'all' | 'with' | 'without';
  onImageFilterChange?: (value: 'all' | 'with' | 'without') => void;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

type SortField = 'name' | 'code' | 'stock' | 'price' | 'offer' | 'category' | 'supplier' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onView,
  onToggleFavorite,
  onBulkAction,
  isLoading = false,
  enableVirtualization = false,
  virtualizationHeight = 600,
  onLoadMore,
  hasMore = false,
  currentPage: controlledCurrentPage,
  itemsPerPage: controlledItemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalItems,
  visibleColumns,
  searchValue,
  onSearchChange,
  imageFilterValue,
  onImageFilterChange,
  sortBy,
  sortOrder: controlledSortOrder,
  onSortChange,
  canEdit = true,
  canDelete = true
}: ProductTableProps) {
  const fmtCurrency = useCurrencyFormatter();
  const [normalWidths, setNormalWidths] = useState<Record<string, number>>({
    select: 48,
    image: 64,
    name: 300,
    code: 120,
    category: 150,
    supplier: 160,
    stock: 120,
    price: 120,
    offer: 120,
    status: 120,
    actions: 48,
  });
  const normalResizeRef = React.useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('products-table-normal-cols') || '{}');
      if (saved && typeof saved === 'object') setNormalWidths(prev => ({ ...prev, ...saved }));
    } catch { }
  }, []);
  const onNormalResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    normalResizeRef.current = { key, startX: e.clientX, startWidth: normalWidths[key] };
    const onMove = (ev: MouseEvent) => {
      const ref = normalResizeRef.current; if (!ref) return;
      const delta = ev.clientX - ref.startX;
      const next = Math.max(80, Math.min(800, ref.startWidth + delta));
      setNormalWidths(prev => {
        const updated = { ...prev, [key]: next };
        try { localStorage.setItem('products-table-normal-cols', JSON.stringify(updated)); } catch { }
        return updated;
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      normalResizeRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [normalWidths]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  useEffect(() => {
    if (typeof sortBy === 'string') setSortField(sortBy);
    if (typeof controlledSortOrder === 'string') setSortOrder(controlledSortOrder);
  }, [sortBy, controlledSortOrder]);
  const [uncontrolledCurrentPage, setUncontrolledCurrentPage] = useState(1);
  const [uncontrolledItemsPerPage, setUncontrolledItemsPerPage] = useState(25);
  const isControlled = typeof totalItems === 'number' || typeof controlledCurrentPage === 'number' || typeof controlledItemsPerPage === 'number';
  const currentPage = typeof controlledCurrentPage === 'number' ? controlledCurrentPage : uncontrolledCurrentPage;
  const itemsPerPage = typeof controlledItemsPerPage === 'number' ? controlledItemsPerPage : uncontrolledItemsPerPage;
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchTerm !== searchInput) setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, searchTerm]);
  useEffect(() => {
    if (onSearchChange) onSearchChange(searchTerm);
  }, [searchTerm, onSearchChange]);

  useEffect(() => {
    if (typeof searchValue === 'string' && searchValue !== searchInput) {
      setSearchInput(searchValue);
      setSearchTerm(searchValue);
    }
  }, [searchValue, searchInput]);
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [imageFilter, setImageFilter] = useState<'all' | 'with' | 'without'>('all');
  const [offerFilter, setOfferFilter] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    if (imageFilterValue) {
      setImageFilter(prev => prev !== imageFilterValue ? imageFilterValue : prev);
    }
  }, [imageFilterValue]);
  const [useVirtualization, setUseVirtualization] = useState(enableVirtualization);

  // Estados de operación
  const deleteOperation = useOperationState();
  const bulkOperation = useOperationState();
  const favoriteOperation = useOperationState();

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    const st = (searchTerm || '').toLowerCase();
    let filtered = products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const code = ((product as any).code ?? (product as any).sku ?? '').toLowerCase();
      const categoryName = (product.category?.name || '').toLowerCase();
      const supplierName = ((product.supplier?.name) || '').toLowerCase();
      return (
        name.includes(st) ||
        code.includes(st) ||
        categoryName.includes(st) ||
        supplierName.includes(st)
      );
    });

    // Filtro por stock
    if (stockFilter !== 'all') {
      filtered = filtered.filter(product => {
        switch (stockFilter) {
          case 'low':
            return product.stock <= product.minStock && product.stock > 0;
          case 'out':
            return product.stock === 0;
          case 'normal':
            return product.stock > product.minStock;
          default:
            return true;
        }
      });
    }

    if (imageFilter !== 'all') {
      filtered = filtered.filter(product => {
        const hasImage = !!(product.image || product.images?.[0]);
        return imageFilter === 'with' ? hasImage : !hasImage;
      });
    }
    if (offerFilter !== 'all') {
      filtered = filtered.filter(product => {
        const hasOffer = !!(((product as any).offer_price && (product as any).offer_price > 0));
        return offerFilter === 'with' ? hasOffer : !hasOffer;
      });
    }
    return filtered;
  }, [products, searchTerm, stockFilter, imageFilter, offerFilter]);

  useEffect(() => {
    if (onImageFilterChange) onImageFilterChange(imageFilter);
  }, [imageFilter, onImageFilterChange]);

  // Ordenar productos
  const sortedProducts = useMemo(() => {
    if (onSortChange) return filteredProducts;
    return [...filteredProducts].sort((a, b) => {
      let aValue: any = sortField === 'offer' ? (a as any).offer_price ?? 0 : (a as any)[sortField];
      let bValue: any = sortField === 'offer' ? (b as any).offer_price ?? 0 : (b as any)[sortField];

      if (sortField === 'category') {
        aValue = a.category?.name || '';
        bValue = b.category?.name || '';
      }
      if (sortField === 'supplier') {
        aValue = a.supplier?.name || '';
        bValue = b.supplier?.name || '';
      }

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortField, sortOrder, onSortChange]);

  // Paginación
  const paginationInfo: PaginationInfo = useMemo(() => {
    const total = typeof totalItems === 'number' ? totalItems : sortedProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
    return {
      currentPage,
      totalPages,
      totalItems: total,
      itemsPerPage
    };
  }, [sortedProducts.length, itemsPerPage, currentPage, totalItems]);

  const paginatedProducts = useMemo(() => {
    if (isControlled) {
      return sortedProducts;
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage, itemsPerPage, isControlled]);

  // Funciones de utilidad
  const handleSort = (field: SortField) => {
    const nextOrder: SortOrder = sortField === field ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
    setSortField(field);
    setSortOrder(nextOrder);
    if (onSortChange) onSortChange(field, nextOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(paginatedProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  }, []);

  const getStockStatus = useCallback((product: Product) => {
    if (product.stock === 0) return 'out';
    if (product.stock <= product.minStock) return 'low';
    return 'normal';
  }, []);

  const getStockBadge = useCallback((product: Product) => {
    const status = getStockStatus(product);
    switch (status) {
      case 'out':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Sin Stock</Badge>;
      case 'low':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Stock Bajo</Badge>;
      default:
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Normal</Badge>;
    }
  }, [getStockStatus]);

  // Usar util global para formateo acorde a Paraguay (PYG sin decimales)

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Funciones de manejo con estados mejorados
  const handleDeleteProduct = useCallback(async (productId: string) => {
    deleteOperation.startOperation();
    try {
      await onDelete?.(productId);
      deleteOperation.completeOperation();
      toast.success('Producto eliminado exitosamente');
    } catch (error: any) {
      deleteOperation.failOperation(error.message || 'Error al eliminar producto');
      toast.error('Error al eliminar producto');
    }
  }, [onDelete, deleteOperation]);

  const handleToggleFavorite = useCallback(async (productId: string) => {
    favoriteOperation.startOperation();
    try {
      await onToggleFavorite?.(productId);
      favoriteOperation.completeOperation();
    } catch (error: any) {
      favoriteOperation.failOperation(error.message || 'Error al cambiar favorito');
      toast.error('Error al cambiar favorito');
    }
  }, [onToggleFavorite, favoriteOperation]);

  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedProducts.length === 0) {
      toast.error('Selecciona al menos un producto');
      return;
    }

    bulkOperation.startOperation();
    try {
      await onBulkAction?.(action, selectedProducts);
      bulkOperation.completeOperation();
      setSelectedProducts([]);

      // Mensajes específicos por acción
      switch (action) {
        case 'delete':
          toast.success(`${selectedProducts.length} productos eliminados`);
          break;
        case 'export':
          toast.success(`Exportando ${selectedProducts.length} productos`);
          break;
        case 'favorite':
          toast.success(`${selectedProducts.length} productos marcados como favoritos`);
          break;
        case 'unfavorite':
          toast.success(`${selectedProducts.length} productos desmarcados como favoritos`);
          break;
        default:
          toast.success(`Acción realizada en ${selectedProducts.length} productos`);
      }
    } catch (error: any) {
      bulkOperation.failOperation(error.message || 'Error en acción masiva');
      toast.error('Error al realizar la acción');
    }
  }, [selectedProducts, onBulkAction, bulkOperation]);

  // Configuración de columnas para virtualización
  const virtualizationColumns = useMemo(() => [
    {
      key: 'select',
      header: '',
      width: 50,
      render: (product: Product) => (
        <Checkbox
          checked={selectedProducts.includes(product.id)}
          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
        />
      )
    },
    {
      key: 'image',
      header: '',
      width: 60,
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={(product.image || (product.images?.[0] ?? ''))} alt={product.name} loading="lazy" decoding="async" />
            <AvatarFallback className="bg-muted">
              <Package className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {!(product.image || product.images?.[0]) && (
            <Badge variant="secondary">Sin imagen</Badge>
          )}
        </div>
      )
    },
    {
      key: 'name',
      header: 'Producto',
      width: 300,
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium">{product.name}</div>
            {product.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {product.description}
              </div>
            )}
          </div>
          {product.isFavorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
        </div>
      )
    },
    {
      key: 'code',
      header: 'Código',
      width: 120,
      render: (product: Product) => (
        <span className="font-mono">{product.code}</span>
      )
    },
    {
      key: 'category',
      header: 'Categoría',
      width: 150,
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {product.category?.name || 'Sin categoría'}
          </Badge>
        </div>
      )
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      width: 160,
      render: (product: Product) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {product.supplier?.name || 'Sin proveedor'}
          </Badge>
        </div>
      )
    },
    {
      key: 'stock',
      header: 'Stock',
      width: 120,
      render: (product: Product) => (
        <div className="text-center">
          <div className="font-medium">{product.stock}</div>
          {getStockBadge(product)}
        </div>
      )
    },
    {
      key: 'price',
      header: 'Precio',
      width: 120,
      render: (product: Product) => (
        <div className="text-right">
          <div className="font-medium">{fmtCurrency(product.price)}</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 mt-1">Ver</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span className="font-medium">{fmtCurrency(((product as any).costPrice ?? (product as any).cost_price ?? 0) as number)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mayorista</span><span className="font-medium">{(((product as any).wholesalePrice ?? (product as any).wholesale_price) != null && ((product as any).wholesalePrice ?? (product as any).wholesale_price) > 0) ? fmtCurrency(((product as any).wholesalePrice ?? (product as any).wholesale_price) as number) : '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Oferta</span><span className="font-medium">{(((product as any).offer_price) != null && (product as any).offer_price > 0) ? fmtCurrency((product as any).offer_price as number) : '-'}</span></div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )
    },
    {
      key: 'offer',
      header: 'Oferta',
      width: 120,
      render: (product: any) => (
        <div className="text-right font-medium">
          {product.offer_price != null && product.offer_price > 0 ? fmtCurrency(product.offer_price) : '-'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: 120,
      render: (product: Product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onView?.(product)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => onEdit?.(product)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleToggleFavorite(product.id)}>
              {product.isFavorite ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Quitar de favoritos
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Agregar a favoritos
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem
                onClick={() => handleDeleteProduct(product.id)}
                className="text-destructive"
                disabled={deleteOperation.isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [selectedProducts, handleSelectProduct, handleToggleFavorite, handleDeleteProduct, onView, onEdit, deleteOperation.isLoading, fmtCurrency, getStockBadge, canEdit, canDelete]);

  // ...

  // Componente de Skeleton mejorado para la tabla
  const ProductTableSkeleton = () => (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-10 w-80" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-24" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16" />
                </TableHead>
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-8 ml-auto" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && (
            <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 px-3 py-2 rounded-md border">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                Cargando...
              </div>
            </div>
          )}
        </div>

        {/* Skeleton para paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Renderizado principal con opción de virtualización
  const activeVirtualColumns = useMemo(() => {
    return virtualizationColumns.filter(col => {
      if (col.key === 'select' || col.key === 'actions') return true;
      return visibleColumns?.[col.key as keyof typeof visibleColumns] !== false;
    });
  }, [virtualizationColumns, visibleColumns]);
 
  if (isLoading) {
    return <ProductTableSkeleton />;
  }

  // Renderizado con virtualización
  if (useVirtualization && sortedProducts.length > 50) {
    return (
      <div className="space-y-4">
        {/* Controles superiores */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder="Buscar productos..."
                  value={searchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchInput(v);
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  variant={useVirtualization ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseVirtualization(!useVirtualization)}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {useVirtualization ? 'Modo Virtual' : 'Modo Normal'}
                </Button>
                <Select value={stockFilter} onValueChange={(value: any) => setStockFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar por stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="normal">Stock Normal</SelectItem>
                    <SelectItem value="low">Stock Bajo</SelectItem>
                    <SelectItem value="out">Sin Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={imageFilter} onValueChange={(value: any) => setImageFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtrar por imagen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="with">Con imagen</SelectItem>
                    <SelectItem value="without">Sin imagen</SelectItem>
                  </SelectContent>
                </Select>
                {selectedProducts.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <LoadingButton
                        variant="outline"
                        loading={bulkOperation.isLoading}
                        loadingText="Procesando..."
                      >
                        Acciones ({selectedProducts.length})
                      </LoadingButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones masivas</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activar seleccionados
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Desactivar seleccionados
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar seleccionados
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction('favorite')}>
                        <Star className="h-4 w-4 mr-2" />
                        Marcar como favoritos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleBulkAction('delete')}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar seleccionados
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Estados de operación */}
            <div className="space-y-2">
              <OperationState state={bulkOperation.state} operation="update" />
              <OperationState state={deleteOperation.state} operation="delete" />
              <OperationState state={favoriteOperation.state} operation="update" />
            </div>
          </CardHeader>
        </Card>

        {/* Tabla virtualizada */}
        <Card>
          <CardContent className="p-0">
            <VirtualizedTable
              data={sortedProducts}
              height={virtualizationHeight}
              itemHeight={80}
              columns={activeVirtualColumns}
              isLoading={isLoading}
              onEndReached={onLoadMore}
              endReachedThreshold={200}
              className="w-full"
              emptyMessage="No se encontraron productos"
            />
          </CardContent>
        </Card>

        {/* Información de resultados */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Mostrando {sortedProducts.length} productos
            {searchTerm && ` (filtrados de ${products.length})`}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Modo Virtualizado</Badge>
            {hasMore && onLoadMore && (
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                loading={isLoading}
                loadingText="Cargando..."
              >
                Cargar más
              </LoadingButton>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No hay productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No se encontraron productos para los filtros actuales.</div>
        </CardContent>
      </Card>
    );
  }

  const cols = {
    image: (visibleColumns && visibleColumns.image !== false) ?? true,
    name: (visibleColumns && visibleColumns.name !== false) ?? true,
    code: (visibleColumns && visibleColumns.code !== false) ?? true,
    category: (visibleColumns && visibleColumns.category !== false) ?? true,
    supplier: (visibleColumns && (visibleColumns as any).supplier !== false) ?? true,
    stock: (visibleColumns && visibleColumns.stock !== false) ?? true,
    price: (visibleColumns && visibleColumns.price !== false) ?? true,
    offer: (visibleColumns && (visibleColumns as any).offer !== false) ?? true,
    status: (visibleColumns && visibleColumns.status !== false) ?? true,
  } as const;

  return (
    <div className="space-y-4">
      {/* Controles superiores */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-sm">
              <Input
                placeholder="Buscar productos..."
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);
                }}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant={useVirtualization ? "default" : "outline"}
                size="sm"
                onClick={() => setUseVirtualization(!useVirtualization)}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {useVirtualization ? 'Modo Virtual' : 'Modo Normal'}
              </Button>
              <Select value={stockFilter} onValueChange={(value: any) => setStockFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="normal">Stock Normal</SelectItem>
                  <SelectItem value="low">Stock Bajo</SelectItem>
                  <SelectItem value="out">Sin Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={imageFilter} onValueChange={(value: any) => setImageFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por imagen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="with">Con imagen</SelectItem>
                  <SelectItem value="without">Sin imagen</SelectItem>
                </SelectContent>
              </Select>
              <Select value={offerFilter} onValueChange={(value: any) => setOfferFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por oferta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="with">Con oferta</SelectItem>
                  <SelectItem value="without">Sin oferta</SelectItem>
                </SelectContent>
              </Select>
              {selectedProducts.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <LoadingButton
                      variant="outline"
                      loading={bulkOperation.isLoading}
                      loadingText="Procesando..."
                    >
                      Acciones ({selectedProducts.length})
                    </LoadingButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Desactivar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar seleccionados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('favorite')}>
                      <Star className="h-4 w-4 mr-2" />
                      Marcar como favoritos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction('delete')}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar seleccionados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Estados de operación */}
          <div className="space-y-2">
            <OperationState state={bulkOperation.state} operation="update" />
            <OperationState state={deleteOperation.state} operation="delete" />
            <OperationState state={favoriteOperation.state} operation="update" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" style={{ width: normalWidths.select }}>
                    <Checkbox
                      checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {cols.image && (
                    <TableHead className="w-16 relative" style={{ width: normalWidths.image }}>
                      Imagen
                      <div onMouseDown={(e) => onNormalResizeStart('image', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  <TableHead className="relative" aria-sort={sortField === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {cols.name && (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.name }}>
                          Producto
                        </span> {getSortIcon('name')}
                      </Button>
                    )}
                    {cols.name && (
                      <div onMouseDown={(e) => onNormalResizeStart('name', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    )}
                  </TableHead>
                  <TableHead className="relative" aria-sort={sortField === 'code' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {cols.code && (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('code')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.code }}>
                          Código
                        </span> {getSortIcon('code')}
                      </Button>
                    )}
                    {cols.code && (
                      <div onMouseDown={(e) => onNormalResizeStart('code', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    )}
                  </TableHead>
                  {cols.category && (
                    <TableHead className="relative" aria-sort={sortField === 'category' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('category')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.category }}>
                          Categoría
                        </span> {getSortIcon('category')}
                      </Button>
                      <div onMouseDown={(e) => onNormalResizeStart('category', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  {cols.supplier && (
                    <TableHead className="relative" aria-sort={sortField === 'supplier' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('supplier')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.supplier }}>
                          Proveedor
                        </span> {getSortIcon('supplier')}
                      </Button>
                      <div onMouseDown={(e) => onNormalResizeStart('supplier', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  {cols.stock && (
                    <TableHead className="relative" aria-sort={sortField === 'stock' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('stock')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.stock }}>
                          Stock
                        </span> {getSortIcon('stock')}
                      </Button>
                      <div onMouseDown={(e) => onNormalResizeStart('stock', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  {cols.price && (
                    <TableHead className="relative" aria-sort={sortField === 'price' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('price')}
                        className="h-auto p-0 font-semibold"
                      >
                        <span style={{ display: 'inline-block', width: normalWidths.price }}>
                          Precio
                        </span> {getSortIcon('price')}
                      </Button>
                      <div onMouseDown={(e) => onNormalResizeStart('price', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  {cols.offer && (
                    <TableHead className="relative">
                      <span style={{ display: 'inline-block', width: normalWidths.offer }}>
                        Oferta
                      </span>
                      <div onMouseDown={(e) => onNormalResizeStart('offer', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" />
                    </TableHead>
                  )}
                  {cols.status && (
                    <TableHead className="relative" style={{ width: normalWidths.status }}>Estado<div onMouseDown={(e) => onNormalResizeStart('status', e)} className="absolute right-0 top-0 h-full w-2 cursor-col-resize" /></TableHead>
                  )}
                  <TableHead className="w-12" style={{ width: normalWidths.actions }}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell style={{ width: normalWidths.select }}>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                    </TableCell>
                    {cols.image && (
                      <TableCell style={{ width: normalWidths.image }}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={(product.image || (product.images?.[0] ?? ''))} alt={product.name} loading="lazy" decoding="async" />
                            <AvatarFallback className="bg-muted">
                              <Package className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          {!(product.image || product.images?.[0]) && (
                            <Badge variant="secondary">Sin imagen</Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {cols.name && (
                      <TableCell style={{ width: normalWidths.name }}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {product.description}
                              </div>
                            )}
                          </div>
                          {product.isFavorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    {cols.code && (
                      <TableCell className="font-mono" style={{ width: normalWidths.code }}>{product.code}</TableCell>
                    )}
                    {cols.category && (
                      <TableCell style={{ width: normalWidths.category }}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {product.category?.name || 'Sin categoría'}
                          </Badge>
                        </div>
                      </TableCell>
                    )}
                    {cols.supplier && (
                      <TableCell style={{ width: normalWidths.supplier }}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {product.supplier?.name || 'Sin proveedor'}
                          </Badge>
                          {!product.supplier?.name && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Proveedor restringido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {cols.stock && (
                      <TableCell style={{ width: normalWidths.stock }}>
                        <div className="text-center">
                          <div className="font-medium">{product.stock}</div>
                          {getStockBadge(product)}
                        </div>
                      </TableCell>
                    )}
                    {cols.price && (
                      <TableCell style={{ width: normalWidths.price }}>
                        <div className="text-right">
                          <div className="font-medium">{fmtCurrency(product.price)}</div>
                          {product.discount_percentage && product.discount_percentage > 0 && (
                            <div className="text-xs text-green-600">
                              {product.discount_percentage}% off
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {cols.offer && (
                      <TableCell style={{ width: normalWidths.offer }}>
                        <div className="text-right">
                          <div className="font-medium">{(product as any).offer_price != null && (product as any).offer_price > 0 ? fmtCurrency((product as any).offer_price) : '-'}</div>
                        </div>
                      </TableCell>
                    )}
                    {cols.status && (
                      <TableCell style={{ width: normalWidths.status }}>
                        {getStockBadge(product)}
                      </TableCell>
                    )}
                    <TableCell style={{ width: normalWidths.actions }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onView?.(product)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit?.(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFavorite(product.id)}>
                            {product.isFavorite ? (
                              <>
                                <StarOff className="h-4 w-4 mr-2" />
                                Quitar de favoritos
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Agregar a favoritos
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.code)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar código
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Información y paginación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, paginationInfo.totalItems)} a{' '}
                {Math.min(currentPage * itemsPerPage, paginationInfo.totalItems)} de{' '}
                {paginationInfo.totalItems} productos
              </span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  const next = Number(value);
                  if (onItemsPerPageChange) {
                    onItemsPerPageChange(next);
                    if (onPageChange) onPageChange(1);
                  } else {
                    setUncontrolledItemsPerPage(next);
                    setUncontrolledCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">por página</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (onPageChange ? onPageChange(1) : setUncontrolledCurrentPage(1))}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (onPageChange ? onPageChange(currentPage - 1) : setUncontrolledCurrentPage(currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                Página {currentPage} de {paginationInfo.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (onPageChange ? onPageChange(currentPage + 1) : setUncontrolledCurrentPage(currentPage + 1))}
                disabled={currentPage === paginationInfo.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (onPageChange ? onPageChange(paginationInfo.totalPages) : setUncontrolledCurrentPage(paginationInfo.totalPages))}
                disabled={currentPage === paginationInfo.totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
