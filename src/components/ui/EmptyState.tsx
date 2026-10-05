import React from 'react';
import { PackageOpen, Receipt, Building2, TrendingUp, Search, Plus } from 'lucide-react';
import { Button } from './Button';

export type EmptyStateVariant = 'invoices' | 'products' | 'suppliers' | 'history' | 'search' | 'generic';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  variant?: EmptyStateVariant;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  variant = 'generic',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'invoices':
        return <Receipt className="w-8 h-8 text-[#4B49AC]" />;
      case 'products':
        return <PackageOpen className="w-8 h-8 text-[#7978E9]" />;
      case 'suppliers':
        return <Building2 className="w-8 h-8 text-[#7DA0FA]" />;
      case 'history':
        return <TrendingUp className="w-8 h-8 text-[#F3797E]" />;
      case 'search':
        return <Search className="w-8 h-8 text-[#8F93A0]" />;
      default:
        return <PackageOpen className="w-8 h-8 text-[#4B49AC]" />;
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-[#D5DCED] bg-white shadow-skydash animate-in fade-in duration-300 ${className}`}
    >
      <div className="p-4 bg-[#F5F7FF] text-[#4B49AC] mb-4 rounded-2xl border border-[#ECEEF5] shadow-xs ring-4 ring-[#ECEEF5]/60">
        {icon || getDefaultIcon()}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-[#6C7383] max-w-md mt-1.5 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="outline" size="sm" onClick={onSecondaryAction} className="rounded-xl px-4 py-2">
            {secondaryActionLabel}
          </Button>
        )}
        {actionLabel && onAction && (
          <Button
            variant="primary"
            size="sm"
            onClick={onAction}
            icon={<Plus className="w-4 h-4" />}
            className="rounded-xl px-5 py-2 shadow-md shadow-[#4B49AC]/25 font-bold"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
