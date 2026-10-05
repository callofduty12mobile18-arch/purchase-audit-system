import React from 'react';
import { TableSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { NoSearchResults } from './NoSearchResults';
import { EmptyState, EmptyStateVariant } from './EmptyState';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean | Error | string | null;
  onRetry?: () => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  emptyText?: string;
  emptyTitle?: string;
  emptyVariant?: EmptyStateVariant;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  isError = null,
  onRetry,
  searchQuery,
  onClearSearch,
  emptyText = 'No records found',
  emptyTitle,
  emptyVariant,
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  skeletonRows = 5,
}: TableProps<T>) {
  const renderCell = (col: Column<T>, row: T, rowIndex: number) => {
    if (col.cell) return col.cell(row, rowIndex);
    if (col.accessorKey) return row[col.accessorKey] as React.ReactNode;
    return null;
  };

  // 1. Loading State (Shimmer Skeleton)
  if (isLoading) {
    return <TableSkeleton rows={skeletonRows} columns={columns.length} />;
  }

  // 2. Error State
  if (isError) {
    return (
      <ErrorState
        error={isError === true ? 'An error occurred while fetching table records.' : isError}
        onRetry={onRetry}
      />
    );
  }

  // 3. Zero Matches with Active Search Query -> NoSearchResults State
  if (data.length === 0 && searchQuery && searchQuery.trim().length > 0) {
    return (
      <NoSearchResults
        searchQuery={searchQuery}
        onClearSearch={onClearSearch}
      />
    );
  }

  // 4. Empty State (No records in database/catalog)
  if (data.length === 0) {
    if (emptyTitle || emptyActionLabel) {
      return (
        <EmptyState
          title={emptyTitle || 'No Records Found'}
          description={emptyText}
          variant={emptyVariant}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      );
    }

    return (
      <div className="w-full rounded-2xl border border-[#ECEEF5] bg-white px-4 py-12 text-center text-[#6C7383] shadow-skydash">
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  // 5. Data Display (Mobile Cards + Desktop Responsive Table)
  return (
    <>
      <div className="md:hidden space-y-3">
        {data.map((row, rowIndex) => (
          <div
            key={keyExtractor(row)}
            onClick={() => onRowClick?.(row)}
            className={`rounded-2xl border border-[#ECEEF5] bg-white p-4 space-y-2.5 shadow-skydash ${
              onRowClick ? 'cursor-pointer hover:border-[#4B49AC] hover:shadow-md transition-all active:scale-[0.99]' : ''
            }`}
          >
            {columns.map((col, idx) => {
              const cellContent = renderCell(col, row, rowIndex);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 min-w-0 border-b border-[#ECEEF5]/60 last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#6C7383] font-bold shrink-0">
                    {col.header}
                  </span>
                  <div className="text-xs sm:text-sm text-[#1F1F2C] text-right break-words font-medium min-w-0">
                    {cellContent}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-[#ECEEF5] bg-white shadow-skydash">
        <table className="w-full text-left text-sm text-[#1F1F2C]">
          <thead className="bg-[#F5F7FF] text-[11px] font-bold uppercase tracking-wider text-[#6C7383] border-b border-[#ECEEF5]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-5 py-4 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEEF5]">
            {data.map((row, rowIndex) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors group ${
                  onRowClick ? 'cursor-pointer hover:bg-[#F0F3FF]' : 'hover:bg-[#F8F9FE]'
                }`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-5 py-4 whitespace-nowrap ${col.className || ''}`}>
                    {renderCell(col, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
