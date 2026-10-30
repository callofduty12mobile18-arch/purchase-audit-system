import React from 'react';

interface SkeletonProps {
  className?: string;
}

// Base skeleton block
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`skeleton rounded ${className}`}
    aria-hidden="true"
  />
);

// Shimmer bar for text lines
export const ShimmerBar: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`skeleton h-4 rounded ${className}`}
    aria-hidden="true"
  />
);

// Skeleton for a stat card
export const StatCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-slate-200 shadow-card p-5" aria-hidden="true">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32 mt-3" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
    </div>
  </div>
);

// Skeleton for a full card section
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-slate-200 shadow-card" aria-hidden="true">
    <div className="px-5 py-4 border-b border-slate-100">
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <Skeleton className="h-4 w-3/6" />
    </div>
  </div>
);

// Table row skeleton
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr aria-hidden="true">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className={`h-4 ${i === 0 ? 'w-28' : i === columns - 1 ? 'w-16' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);
