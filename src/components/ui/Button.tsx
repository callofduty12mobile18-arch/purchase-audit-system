import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#4B49AC]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] min-h-[44px] md:min-h-0';

  const variants = {
    primary: 'bg-[#4B49AC] hover:bg-[#3D3B94] text-white font-semibold shadow-md shadow-[#4B49AC]/25 hover:shadow-lg hover:shadow-[#4B49AC]/35 border border-transparent',
    secondary: 'bg-[#7DA0FA] hover:bg-[#688ff7] text-white font-semibold shadow-md shadow-[#7DA0FA]/25 border border-transparent',
    outline: 'bg-white hover:bg-[#F5F7FF] text-[#4B49AC] font-semibold border border-[#D5DCED] hover:border-[#4B49AC] shadow-sm',
    danger: 'bg-[#F3797E] hover:bg-[#e66267] text-white font-semibold shadow-md shadow-[#F3797E]/25 border border-transparent',
    ghost: 'bg-transparent hover:bg-[#F5F7FF] text-[#6C7383] hover:text-[#4B49AC] border border-transparent',
    success: 'bg-[#4B49AC] hover:bg-[#3D3B94] text-white font-semibold shadow-md shadow-[#4B49AC]/25 border border-transparent',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4.5 py-2.5 text-sm gap-2 rounded-xl',
    lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
  };

  return (
    <button
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
