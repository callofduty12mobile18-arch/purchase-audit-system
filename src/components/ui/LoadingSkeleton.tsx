import React from 'react';

export const ShimmerBar: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#ECEEF5] via-[#F5F7FF] to-[#ECEEF5] bg-[length:200%_100%] rounded-lg ${className}`} />
);

export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}> = ({ rows = 5, columns = 5, showHeader = true }) => {
  return (
    <div className="w-full rounded-2xl border border-[#ECEEF5] bg-white shadow-skydash overflow-hidden">
      {showHeader && (
        <div className="bg-[#F5F7FF] px-6 py-4 border-b border-[#ECEEF5] flex items-center justify-between gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1">
              <ShimmerBar className="h-3.5 w-3/4 max-w-[120px]" />
            </div>
          ))}
        </div>
      )}

      <div className="divide-y divide-[#ECEEF5]/80 p-2 sm:p-0">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4"
          >
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div key={cIdx} className="flex-1 flex items-center gap-2">
                <ShimmerBar
                  className={`h-4 ${
                    cIdx === 0
                      ? 'w-4/5 max-w-[180px]'
                      : cIdx === columns - 1
                      ? 'w-16 ml-auto'
                      : 'w-2/3 max-w-[130px]'
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash space-y-4 ${className}`}>
    <div className="flex items-center justify-between pb-3 border-b border-[#ECEEF5]">
      <div className="space-y-1.5 flex-1 max-w-xs">
        <ShimmerBar className="h-4 w-3/4" />
        <ShimmerBar className="h-3 w-1/2" />
      </div>
      <ShimmerBar className="h-8 w-20 rounded-xl" />
    </div>
    <div className="space-y-3 pt-2">
      <ShimmerBar className="h-10 w-full" />
      <ShimmerBar className="h-10 w-full" />
      <ShimmerBar className="h-10 w-full" />
    </div>
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="p-6 rounded-2xl bg-white border border-[#ECEEF5] shadow-skydash flex items-center justify-between">
    <div className="space-y-2 flex-1">
      <ShimmerBar className="h-3 w-24" />
      <ShimmerBar className="h-7 w-36" />
      <ShimmerBar className="h-3 w-32" />
    </div>
    <div className="w-12 h-12 rounded-2xl bg-[#F5F7FF] border border-[#ECEEF5] animate-pulse" />
  </div>
);

export const LoadingState: React.FC<{
  message?: string;
  submessage?: string;
  className?: string;
}> = ({
  message = 'Loading records...',
  submessage = 'Synchronizing with database, please hold on.',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-[#ECEEF5] bg-white shadow-skydash ${className}`}
    >
      <div className="relative mb-4">
        <div className="w-10 h-10 border-3 border-[#ECEEF5] border-t-[#4B49AC] rounded-full animate-spin" />
      </div>
      <h4 className="text-sm font-bold text-[#1F1F2C] tracking-wide uppercase">{message}</h4>
      {submessage && <p className="text-xs text-[#6C7383] mt-1 max-w-xs">{submessage}</p>}
    </div>
  );
};
