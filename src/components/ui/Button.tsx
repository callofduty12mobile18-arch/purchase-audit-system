import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-600/30 shadow-sm disabled:bg-brand-300',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-400',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300 disabled:text-slate-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30 shadow-sm disabled:bg-red-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:cursor-not-allowed',
        'select-none whitespace-nowrap',
        'min-w-[44px] min-h-[44px]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
      ) : (
        icon && iconPosition === 'left' && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )
      )}
      {children && <span>{children}</span>}
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
};
