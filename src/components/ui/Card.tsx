import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  action,
}) => {
  return (
    <div className={clsx('bg-white border border-[#ECEEF5] shadow-skydash rounded-2xl p-6 transition-all duration-200', className)}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-[#ECEEF5]">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold tracking-wide text-[#1F1F2C] uppercase">{title}</h3>}
            {subtitle && <p className="text-xs text-[#6C7383] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
