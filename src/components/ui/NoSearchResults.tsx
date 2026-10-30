import React from 'react';
import { SearchX } from 'lucide-react';
import { Button } from './Button';

interface NoSearchResultsProps {
  query?: string;
  onClear?: () => void;
}

export const NoSearchResults: React.FC<NoSearchResultsProps> = ({ query, onClear }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <SearchX className="h-5 w-5 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-700">
      {query ? `No results for "${query}"` : 'No results'}
    </p>
    <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search or filters.</p>
    {onClear && (
      <Button variant="outline" size="sm" className="mt-3" onClick={onClear}>
        Clear search
      </Button>
    )}
  </div>
);
