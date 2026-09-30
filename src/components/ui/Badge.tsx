import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className
}) => {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full tracking-wide transition-colors';

  const variants = {
    default: 'bg-[#F5F7FF] text-[#4B49AC] border border-[#D5DCED]',
    outline: 'bg-transparent text-[#4B49AC] border border-[#D5DCED] hover:border-[#4B49AC]',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    danger: 'bg-[#F3797E]/15 text-[#D53037] border border-[#F3797E]/30',
    info: 'bg-[#7DA0FA]/15 text-[#2A46D8] border border-[#7DA0FA]/30',
    purple: 'bg-[#7978E9]/15 text-[#524BC8] border border-[#7978E9]/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
};
