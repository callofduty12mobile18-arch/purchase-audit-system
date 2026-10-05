import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isValid?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  isValid,
  helperText,
  icon,
  endIcon,
  className,
  id,
  required,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-[#1F1F2C] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </span>
          {isValid && !error && (
            <span className="text-emerald-600 text-[11px] font-semibold flex items-center gap-1 normal-case tracking-normal">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid
            </span>
          )}
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
          required={required}
          className={clsx(
            'w-full rounded-xl bg-white border text-[#1F1F2C] placeholder-[#8F93A0] text-sm transition-all duration-150 focus:outline-none focus:ring-2',
            icon ? 'pl-10' : 'pl-3.5',
            (endIcon || error || isValid) ? 'pr-10' : 'pr-3.5',
            'py-2.5 md:py-2 min-h-[44px] md:min-h-0',
            error
              ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20'
              : isValid
              ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
              : 'border-[#D5DCED] hover:border-[#B5C2E0] focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]',
            className
          )}
          {...props}
        />
        {error ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-rose-500">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : isValid ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        ) : endIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8F93A0]">
            {endIcon}
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-[#8F93A0] mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
