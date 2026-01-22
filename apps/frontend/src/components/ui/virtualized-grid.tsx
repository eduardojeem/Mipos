'use client';

import React, { useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { cn } from '@/lib/utils';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnWidth?: number;
  rowHeight?: number;
  columnCount?: number;
  overscanCount?: number;
  className?: string;
  emptyMessage?: string;
}

interface GridCellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columnCount: number;
    renderItem: (item: any, index: number) => React.ReactNode;
  };
}

function GridCell({ columnIndex, rowIndex, style, data }: GridCellProps) {
  const { items, columnCount, renderItem } = data;
  const index = rowIndex * columnCount + columnIndex;
  const item = items[index];

  if (!item) {
    return null;
  }

  return (
    <div style={style} className="p-2">
      {renderItem(item, index)}
    </div>
  );
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columnWidth = 300,
  rowHeight = 400,
  columnCount: initialColumnCount,
  overscanCount = 5,
  className,
  emptyMessage = "No hay elementos para mostrar"
}: VirtualizedGridProps<T>) {
  const columnCount = useMemo(() => {
    if (initialColumnCount) return initialColumnCount;
    
    // Responsive column calculation for different screen sizes
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) return 1; // Mobile: 1 column
      if (screenWidth < 768) return 2; // Small tablets: 2 columns
      if (screenWidth < 1024) return 3; // Tablets: 3 columns
      return Math.max(1, Math.floor(screenWidth / columnWidth)); // Desktop: dynamic columns
    }
    
    return Math.max(1, Math.floor(1000 / columnWidth)); // Fallback calculation
  }, [initialColumnCount, columnWidth]);

  const rowCount = useMemo(() => {
    return Math.ceil(items.length / columnCount);
  }, [items.length, columnCount]);

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      <AutoSizer>
        {({ width, height }) => (
          <Grid
            columnCount={columnCount}
            columnWidth={width / columnCount}
            height={height}
            rowCount={rowCount}
            rowHeight={rowHeight}
            width={width}
            overscanCount={overscanCount}
            itemData={{
              items,
              columnCount,
              renderItem
            }}
          >
            {GridCell}
          </Grid>
        )}
      </AutoSizer>
    </div>
  );
}