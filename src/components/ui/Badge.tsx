import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'blue';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  success: 'bg-green-50 text-green-700 ring-green-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger:  'bg-red-50 text-red-700 ring-red-600/20',
  info:    'bg-blue-50 text-blue-700 ring-blue-600/20',
  blue:    'bg-blue-50 text-blue-700 ring-blue-600/20',
  purple:  'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5',
        'text-xs font-medium',
        'ring-1 ring-inset',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
};
