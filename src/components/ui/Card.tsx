import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
}) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-card ${className}`}>
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {title && (
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          {action && (
            <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">{action}</div>
          )}
        </div>
      )}
      <div className={noPadding ? '' : `p-4 sm:p-5 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
