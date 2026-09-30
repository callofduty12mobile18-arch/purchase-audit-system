import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-[#D5DCED] bg-white shadow-skydash">
      <div className="p-4 bg-[#F5F7FF] text-[#4B49AC] mb-4 rounded-2xl border border-[#ECEEF5] shadow-xs">
        {icon || <PackageOpen className="w-8 h-8" />}
      </div>
      <h4 className="text-lg font-bold text-[#1F1F2C]">{title}</h4>
      <p className="text-sm text-[#6C7383] max-w-md mt-1 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
