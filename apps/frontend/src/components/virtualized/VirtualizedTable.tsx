'use client';

import React, { useCallback, useMemo } from 'react';
import { FixedSizeList as List, ListOnItemsRenderedProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: number;
  cell?: (value: any, row: T, rowIndex: number) => React.ReactNode;
};

type VirtualizedTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  rowHeight?: number;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  emptyRenderer?: React.ReactNode;
  skeletonRenderer?: (count: number) => React.ReactNode;
};

export function VirtualizedTable<T>({
  columns,
  rows,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  rowHeight = 44,
  className,
  onRowClick,
  emptyRenderer,
  skeletonRenderer,
}: VirtualizedTableProps<T>) {
  const totalWidth = useMemo(() => {
    const fixed = columns.map((c) => c.width ?? 0).reduce((a, b) => a + b, 0);
    return fixed || undefined;
  }, [columns]);

  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const row = rows[index];
      if (!row) return null;

      return (
        <div
          style={style}
          className="flex border-b hover:bg-muted/50 cursor-pointer"
          onClick={() => onRowClick?.(row, index)}
        >
          {columns.map((col, colIndex) => {
            const value = (row as any)[col.key];
            return (
              <div
                key={`${index}-${colIndex}`}
                className="px-3 py-2 text-sm truncate"
                style={{ width: col.width }}
              >
                {col.cell ? col.cell(value, row, index) : String(value ?? '')}
              </div>
            );
          })}
        </div>
      );
    },
    [rows, columns, onRowClick]
  );

  const onItemsRendered = useCallback(
    (props: ListOnItemsRenderedProps) => {
      const { visibleStopIndex } = props;
      if (hasNextPage && !isFetchingNextPage && visibleStopIndex >= rows.length - 20) {
        fetchNextPage?.();
      }
    },
    [hasNextPage, isFetchingNextPage, rows.length, fetchNextPage]
  );

  const Header = (
    <div className="flex border-b bg-muted/30 text-xs font-medium" style={{ width: totalWidth }}>
      {columns.map((col, i) => (
        <div
          key={i}
          className="px-3 py-2 uppercase tracking-wide text-muted-foreground"
          style={{ width: col.width }}
        >
          {col.header}
        </div>
      ))}
    </div>
  );

  const Content = (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          width={totalWidth ?? width}
          itemCount={rows.length}
          itemSize={rowHeight}
          onItemsRendered={onItemsRendered}
        >
          {renderRow}
        </List>
      )}
    </AutoSizer>
  );

  if (isLoading && skeletonRenderer) {
    return (
      <div className={className}>
        {Header}
        <div style={{ height: 400 }}>{skeletonRenderer(10)}</div>
      </div>
    );
  }

  if (!isLoading && rows.length === 0 && emptyRenderer) {
    return (
      <div className={className}>
        {Header}
        {emptyRenderer}
      </div>
    );
  }

  return (
    <div className={className} style={{ width: totalWidth }}>
      {Header}
      <div style={{ height: 480, position: 'relative' }}>{Content}</div>
      {isFetchingNextPage && (
        <div className="p-2 text-xs text-muted-foreground">Cargando más…</div>
      )}
    </div>
  );
}

export default VirtualizedTable;