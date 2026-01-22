'use client';

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height?: number | string;
  itemHeight?: number;
  isLoading?: boolean;
  loadingRowCount?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  emptyMessage?: string;
}

interface RowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    columns: Column<T>[];
    isLoading: boolean;
    onRowClick?: (item: T) => void;
  };
}

function VirtualizedRow<T>({ index, style, data }: RowProps<T>) {
  const { items, columns, isLoading } = data;
  const item = items[index];

  // Loading state
  if (isLoading || !item) {
    return (
      <div style={style} className="flex items-center border-b px-4">
        {columns.map((col, i) => (
          <div
            key={i}
            className={cn("flex-1 px-2", col.className)}
            style={{
              width: typeof col.width === 'number' ? col.width : undefined,
              flex: typeof col.width === 'string' ? col.width : 1
            }}
          >
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={style}
      className="flex items-center border-b hover:bg-muted/50 transition-colors px-4"
    >
      {columns.map((col, i) => (
        <div
          key={i}
          className={cn("flex-1 px-2 overflow-hidden text-ellipsis", col.className)}
          style={{
            width: typeof col.width === 'number' ? col.width : undefined,
            flex: typeof col.width === 'string' ? col.width : 1,
            minWidth: col.minWidth,
            maxWidth: col.maxWidth
          }}
        >
          {col.render(item, index)}
        </div>
      ))}
    </div>
  );
}

export function VirtualizedTable<T>({
  data,
  columns,
  height = 600,
  itemHeight = 60,
  isLoading = false,
  loadingRowCount = 10,
  onEndReached,
  endReachedThreshold = 200,
  className,
  emptyMessage = "No hay datos disponibles"
}: VirtualizedTableProps<T>) {
  const listRef = useRef<List>(null);

  // Handle infinite scroll
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (!onEndReached || scrollUpdateWasRequested || isLoading) return;

    const list = listRef.current;
    if (!list) return;

    // We can't easily get scrollHeight from FixedSizeList directly in the onScroll callback
    // without some calculation or ref access to the outer element.
    // However, react-window passes scrollOffset.
    // A simpler approach is to check if we are near the end based on index.
    // But let's use a ref to the outer element if needed, or just trigger based on item index rendered.
    // For simplicity with FixedSizeList, we'll rely on the parent to pass enough data or use a different approach.
    // Actually, react-window's onItemsRendered is better for this.
  }, [onEndReached, isLoading]);

  const handleItemsRendered = useCallback(({ visibleStopIndex }: any) => {
    if (isLoading || !onEndReached) return;

    // If we're close to the end of the list
    if (visibleStopIndex >= data.length - 5) {
      onEndReached();
    }
  }, [data.length, isLoading, onEndReached]);

  const itemData = useMemo(() => ({
    items: isLoading && data.length === 0 ? Array(loadingRowCount).fill(null) : data,
    columns,
    isLoading: isLoading && data.length === 0
  }), [data, columns, isLoading, loadingRowCount]);

  const itemCount = (isLoading && data.length === 0) ? loadingRowCount : data.length;

  if (!isLoading && data.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-64 border rounded-md text-muted-foreground", className)}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md bg-background", className)} style={{ height }}>
      {/* Header */}
      <div className="flex items-center border-b bg-muted/50 font-medium text-sm h-12 px-4 sticky top-0 z-10">
        {columns.map((col, i) => (
          <div
            key={i}
            className={cn("flex-1 px-2", col.headerClassName)}
            style={{
              width: typeof col.width === 'number' ? col.width : undefined,
              flex: typeof col.width === 'string' ? col.width : 1,
              minWidth: col.minWidth,
              maxWidth: col.maxWidth
            }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized List */}
      <div style={{ height: `calc(100% - 48px)` }}>
        <AutoSizer>
          {({ height: autoHeight, width: autoWidth }) => (
            <List
              ref={listRef}
              height={autoHeight}
              width={autoWidth}
              itemCount={itemCount}
              itemSize={itemHeight}
              itemData={itemData as unknown as {
                items: unknown[];
                columns: Column<unknown>[];
                isLoading: boolean;
                onRowClick?: (item: unknown) => void;
              }}
              onItemsRendered={handleItemsRendered}
            >
              {VirtualizedRow}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

export function useInfiniteScroll<T>(
  loadMore: () => Promise<void>,
  hasMore: boolean,
  isLoading: boolean
) {
  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMore();
    }
  }, [isLoading, hasMore, loadMore]);

  return { handleEndReached };
}
