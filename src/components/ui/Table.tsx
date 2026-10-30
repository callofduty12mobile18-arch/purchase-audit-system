import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { TableRowSkeleton } from './LoadingSkeleton';
import { Button } from './Button';

export interface TableColumn<T> {
  header: string;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  isError?: string | null;
  onRetry?: () => void;

  // Empty state
  emptyTitle?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyVariant?: 'invoices' | 'products' | 'suppliers' | 'default';

  // Search / filter state
  searchQuery?: string;
  onClearSearch?: () => void;

  skeletonRows?: number;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  isError,
  onRetry,
  emptyTitle = 'No records found',
  emptyText = 'There are no items to display.',
  emptyActionLabel,
  onEmptyAction,
  searchQuery,
  onClearSearch,
  skeletonRows = 5,
}: TableProps<T>) {
  const showSkeleton = isLoading;
  const showError = !isLoading && !!isError;
  const showEmpty = !isLoading && !isError && data.length === 0;
  const showData = !isLoading && !isError && data.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      {/* Horizontal scroll container for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={[
                    'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                    col.headerClassName ?? '',
                  ].join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100" aria-live="polite" aria-busy={isLoading}>
            {/* Loading skeleton */}
            {showSkeleton &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRowSkeleton key={i} columns={columns.length} />
              ))}

            {/* Error state */}
            {showError && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Failed to load data</p>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{isError}</p>
                    </div>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        Try again
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {showEmpty && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {searchQuery ? `No results for "${searchQuery}"` : emptyTitle}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
                        {searchQuery
                          ? 'Try adjusting your search or filters.'
                          : emptyText}
                      </p>
                    </div>
                    {searchQuery && onClearSearch && (
                      <Button variant="outline" size="sm" onClick={onClearSearch}>
                        Clear filters
                      </Button>
                    )}
                    {!searchQuery && emptyActionLabel && onEmptyAction && (
                      <Button variant="primary" size="sm" onClick={onEmptyAction}>
                        {emptyActionLabel}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {showData &&
              data.map((row, rowIdx) => (
                <tr
                  key={keyExtractor(row, rowIdx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={[
                    'transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-slate-50'
                      : '',
                  ].join(' ')}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={[
                        'px-4 py-3 text-sm text-slate-700 align-middle',
                        col.className ?? '',
                      ].join(' ')}
                    >
                      {col.cell(row, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
