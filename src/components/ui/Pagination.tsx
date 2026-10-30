import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
      <p className="text-xs text-slate-500 hidden sm:block">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`dots-${i}`} className="h-8 w-8 flex items-center justify-center text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page as number)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={[
                'h-8 w-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-brand-700 text-white border border-brand-700'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};
