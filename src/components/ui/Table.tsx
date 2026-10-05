import React from 'react';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyText?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyText = 'No records found',
}: TableProps<T>) {
  const renderCell = (col: Column<T>, row: T, rowIndex: number) => {
    if (col.cell) return col.cell(row, rowIndex);
    if (col.accessorKey) return row[col.accessorKey] as React.ReactNode;
    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-[#ECEEF5] bg-white px-4 py-12 text-center text-[#6C7383] shadow-skydash">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-7 h-7 border-3 border-[#4B49AC] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs tracking-wider uppercase font-semibold text-[#4B49AC]">Loading records...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-[#ECEEF5] bg-white px-4 py-12 text-center text-[#6C7383] shadow-skydash">
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {data.map((row, rowIndex) => (
          <div
            key={keyExtractor(row)}
            className="rounded-2xl border border-[#ECEEF5] bg-white p-4 space-y-2.5 shadow-skydash"
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
                className="hover:bg-[#F8F9FE] transition-colors group"
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
