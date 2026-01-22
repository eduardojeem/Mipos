'use client';

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  ReactNode,
  CSSProperties 
} from 'react';
export type RowComponentProps = { index: number; style: CSSProperties };
export type CellComponentProps = { columnIndex: number; rowIndex: number; style: CSSProperties };
export type ListImperativeAPI = unknown;
import AutoSizer from 'react-virtualized-auto-sizer';

export function List({
  rowComponent,
  rowCount,
  rowHeight,
  overscanCount,
  onRowsRendered,
  rowProps
}: {
  rowComponent: (props: RowComponentProps) => ReactNode;
  rowCount: number;
  rowHeight: number;
  overscanCount?: number;
  onRowsRendered?: (args: { stopIndex: number }) => void;
  rowProps?: any;
}) {
  useEffect(() => {
    onRowsRendered?.({ stopIndex: Math.max(0, Math.min(rowCount - 1, rowCount - 1)) });
  }, [rowCount, onRowsRendered]);
  return (
    <div style={{ height: rowCount * rowHeight }}>
      {Array.from({ length: rowCount }).map((_, index) => (
        <div key={index} style={{ height: rowHeight }}>
          {rowComponent({ index, style: { height: rowHeight }, } as RowComponentProps)}
        </div>
      ))}
    </div>
  );
}

export function Grid({
  cellComponent,
  columnCount,
  rowCount,
  columnWidth,
  rowHeight,
  overscanCount,
  cellProps
}: {
  cellComponent: (props: CellComponentProps) => ReactNode;
  columnCount: number;
  rowCount: number;
  columnWidth: number;
  rowHeight: number;
  overscanCount?: number;
  cellProps?: any;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columnCount}, ${columnWidth}px)` }}>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        Array.from({ length: columnCount }).map((_, columnIndex) => (
          <div key={`${rowIndex}-${columnIndex}`} style={{ width: columnWidth, height: rowHeight }}>
            {cellComponent({ columnIndex, rowIndex, style: { width: columnWidth, height: rowHeight } })}
          </div>
        ))
      ))}
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';

// Types for virtual scrolling
interface VirtualListItem {
  id: string | number;
  height?: number;
  data: any;
}

interface VirtualListProps {
  items: VirtualListItem[];
  itemHeight?: number;
  renderItem: (props: RowComponentProps & { 
    data: VirtualListItem[];
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => ReactNode;
  className?: string;
  overscan?: number;
  loading?: boolean;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
}

interface VirtualGridProps {
  items: any[][];
  columnCount: number;
  rowCount: number;
  columnWidth: number;
  rowHeight: number;
  renderCell: (props: CellComponentProps) => ReactNode;
  className?: string;
  overscan?: number;
}

interface VirtualTableProps {
  columns: Array<{
    key: string;
    title: string;
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, item: any) => ReactNode;
  }>;
  data: any[];
  rowHeight?: number;
  headerHeight?: number;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onRowClick?: (item: any, index: number) => void;
  selectedRows?: Set<string | number>;
  onRowSelect?: (id: string | number, selected: boolean) => void;
}

// Virtual List Component
export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  itemHeight = 60,
  renderItem,
  className = '',
  overscan = 5,
  loading = false,
  onLoadMore,
  hasNextPage = false,
  searchable = false,
  filterable = false,
  sortable = false,
  onSearch,
  onFilter,
  onSort,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const listRef = useRef<ListImperativeAPI>(null);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  // Handle sort
  const handleSort = useCallback((field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  }, [sortField, sortDirection, onSort]);

  // Infinite scrolling
  const handleItemsRendered = useCallback(({ visibleStopIndex }: any) => {
    if (
      hasNextPage &&
      !loading &&
      visibleStopIndex >= items.length - 5 &&
      onLoadMore
    ) {
      onLoadMore();
    }
  }, [hasNextPage, loading, items.length, onLoadMore]);

  // Enhanced item renderer with loading states
  const ItemRenderer = useCallback(({ index, style }: RowComponentProps) => {
    if (index >= items.length) {
      return (
        <div style={style} className="p-4">
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    return renderItem({ index, style, data: items, ariaAttributes: { 'aria-posinset': index + 1, 'aria-setsize': items.length, role: 'listitem' } });
  }, [items, renderItem]);

  return (
    <div className={`virtual-list ${className}`}>
      {/* Search and Filter Controls */}
      {(searchable || filterable || sortable) && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {searchable && (
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              
              {filterable && (
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              )}
              
              {sortable && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSort('name')}
                  >
                    {sortDirection === 'asc' ? (
                      <SortAsc className="h-4 w-4 mr-2" />
                    ) : (
                      <SortDesc className="h-4 w-4 mr-2" />
                    )}
                    Ordenar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Virtual List */}
      <div className="h-[600px] border rounded-lg">
        <AutoSizer>
          {({ height, width }) => (
            <List
              rowComponent={ItemRenderer}
              rowCount={loading && hasNextPage ? items.length + 5 : items.length}
              rowHeight={itemHeight}
              overscanCount={overscan}
              onRowsRendered={({ stopIndex }) => handleItemsRendered({ visibleStopIndex: stopIndex })}
              rowProps={items}
            />
          )}
        </AutoSizer>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

// Virtual Grid Component
export const VirtualGrid: React.FC<VirtualGridProps> = ({
  items,
  columnCount,
  rowCount,
  columnWidth,
  rowHeight,
  renderCell,
  className = '',
  overscan = 5,
}) => {
  return (
    <div className={`virtual-grid ${className}`}>
      <div className="h-[600px] border rounded-lg">
        <AutoSizer>
          {({ height, width }) => (
            <Grid
              cellComponent={renderCell}
              columnCount={columnCount}
              rowCount={rowCount}
              columnWidth={columnWidth}
              rowHeight={rowHeight}
              overscanCount={overscan}
              cellProps={items}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

// Virtual Table Component
export const VirtualTable: React.FC<VirtualTableProps> = ({
  columns,
  data,
  rowHeight = 50,
  headerHeight = 40,
  loading = false,
  onSort,
  onFilter,
  onRowClick,
  selectedRows = new Set(),
  onRowSelect,
}) => {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Handle sort
  const handleSort = useCallback((field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSort?.(field, newDirection);
  }, [sortField, sortDirection, onSort]);

  // Calculate column widths
  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 150), 0);

  // Row renderer
  const RowRenderer = useCallback(({ index, style }: RowComponentProps) => {
    const item = data[index];
    const isSelected = selectedRows.has(item.id);

    return (
      <div
        style={style}
        className={`flex border-b hover:bg-gray-50 cursor-pointer ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column, colIndex) => {
          const value = item[column.key];
          const width = column.width || 150;
          
          return (
            <div
              key={column.key}
              className="flex items-center px-4 py-2 border-r"
              style={{ width, minWidth: width }}
            >
              {column.render ? column.render(value, item) : (
                <span className="truncate">{value}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [data, columns, selectedRows, onRowClick]);

  return (
    <div className="virtual-table">
      {/* Table Header */}
      <div className="border rounded-t-lg bg-gray-50" style={{ height: headerHeight }}>
        <div className="flex">
          {columns.map((column) => {
            const width = column.width || 150;
            const isSorted = sortField === column.key;
            
            return (
              <div
                key={column.key}
                className="flex items-center justify-between px-4 py-2 border-r font-medium cursor-pointer hover:bg-gray-100"
                style={{ width, minWidth: width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <span className="truncate">{column.title}</span>
                {column.sortable && (
                  <div className="ml-2">
                    {isSorted ? (
                      sortDirection === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Body */}
      <div className="border-x border-b rounded-b-lg" style={{ height: 'calc(100% - 40px)' }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              rowComponent={RowRenderer}
              rowCount={data.length}
              rowHeight={rowHeight}
              overscanCount={5}
              rowProps={data}
            />
          )}
        </AutoSizer>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

// Product List Virtual Component
export const VirtualProductList: React.FC<{
  products: any[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  onProductClick?: (product: any) => void;
}> = ({ products, loading, onLoadMore, hasNextPage, onProductClick }) => {
  const renderProduct = useCallback(({ index, style }: RowComponentProps) => {
    const product = products[index];
    
    return (
      <div style={style} className="p-2">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onProductClick?.(product)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xs font-medium">
                  {product.name?.charAt(0) || 'P'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 truncate">{product.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                    Stock: {product.stock}
                  </Badge>
                  <span className="text-sm font-medium text-green-600">
                    ${product.price}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [products, onProductClick]);

  const items = products.map((product, index) => ({
    id: product.id,
    data: product,
  }));

  return (
    <VirtualList
      items={items}
      itemHeight={120}
      renderItem={renderProduct}
      loading={loading}
      onLoadMore={onLoadMore}
      hasNextPage={hasNextPage}
      searchable
      sortable
      className="h-[600px]"
    />
  );
};

// Sales List Virtual Component
export const VirtualSalesList: React.FC<{
  sales: any[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  onSaleClick?: (sale: any) => void;
}> = ({ sales, loading, onLoadMore, hasNextPage, onSaleClick }) => {
  const columns = [
    {
      key: 'id',
      title: 'ID',
      width: 100,
      sortable: true,
    },
    {
      key: 'customer',
      title: 'Cliente',
      width: 200,
      sortable: true,
      render: (value: any) => value?.name || 'Cliente anónimo',
    },
    {
      key: 'total',
      title: 'Total',
      width: 120,
      sortable: true,
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    {
      key: 'date',
      title: 'Fecha',
      width: 150,
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'status',
      title: 'Estado',
      width: 120,
      render: (value: string) => (
        <Badge variant={value === 'completed' ? 'default' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
  ];

  return (
    <div className="h-[600px]">
      <VirtualTable
        columns={columns}
        data={sales}
        loading={loading}
        onRowClick={onSaleClick}
      />
    </div>
  );
};

export default {
  VirtualList,
  VirtualGrid,
  VirtualTable,
  VirtualProductList,
  VirtualSalesList,
};