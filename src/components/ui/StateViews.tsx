import React from 'react';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Spinner } from './Spinner';

interface StateViewsProps {
  isLoading?: boolean;
  isError?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const StateViews: React.FC<StateViewsProps> = ({
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyText,
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load"
        message={isError}
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle ?? 'Nothing here yet'}
        description={emptyText}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <>{children}</>;
};
