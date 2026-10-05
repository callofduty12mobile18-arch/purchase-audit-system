import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface NoSearchResultsProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export const NoSearchResults: React.FC<NoSearchResultsProps> = ({
  searchQuery,
  onClearSearch,
  title,
  description,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[#ECEEF5] bg-white shadow-skydash animate-in fade-in duration-200 ${className}`}
    >
      <div className="p-4 bg-[#F5F7FF] text-[#6C7383] mb-4 rounded-2xl border border-[#ECEEF5] shadow-xs">
        <SearchX className="w-8 h-8 text-[#7978E9]" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#1F1F2C]">
        {title || (searchQuery ? `No results found for "${searchQuery}"` : 'No matching records found')}
      </h3>

      <p className="text-xs sm:text-sm text-[#6C7383] max-w-md mt-1.5 mb-6 leading-relaxed">
        {description ||
          'Try adjusting your search terms, checking for typos, or clearing active filters to see all available records.'}
      </p>

      {onClearSearch && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          icon={<RotateCcw className="w-3.5 h-3.5 text-[#4B49AC]" />}
          className="rounded-xl px-4 py-2 font-semibold shadow-xs"
        >
          Clear Search & Filters
        </Button>
      )}
    </div>
  );
};
