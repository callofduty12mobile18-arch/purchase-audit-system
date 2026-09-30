import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 10,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-[#ECEEF5] bg-white text-xs text-[#6C7383] shadow-skydash">
      <div>
        {totalItems ? (
          <span>Showing <strong className="text-[#1F1F2C] font-bold">{startItem}</strong> to <strong className="text-[#1F1F2C] font-bold">{endItem}</strong> of <strong className="text-[#1F1F2C] font-bold">{totalItems}</strong></span>
        ) : (
          <span>Page <strong className="text-[#1F1F2C] font-bold">{currentPage}</strong> of <strong className="text-[#1F1F2C] font-bold">{totalPages}</strong></span>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<ChevronLeft className="w-4 h-4" />}
        >
          Prev
        </Button>
        <span className="px-3 py-1 bg-[#F5F7FF] text-[#4B49AC] font-bold rounded-lg border border-[#D5DCED]">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
