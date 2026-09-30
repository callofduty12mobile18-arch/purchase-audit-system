import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  endIcon,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-[#1F1F2C]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8F93A0]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-xl bg-white border text-[#1F1F2C] placeholder-[#8F93A0] text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]',
            icon ? 'pl-10' : 'pl-3.5',
            endIcon ? 'pr-10' : 'pr-3.5',
            'py-2.5 md:py-2 min-h-[44px] md:min-h-0',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-[#D5DCED] hover:border-[#B5C2E0]',
            className
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8F93A0]">
            {endIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-500 font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#8F93A0] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
