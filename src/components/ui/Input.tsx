import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isValid?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  isValid,
  icon,
  iconRight,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const borderClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : isValid
    ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
    : 'border-slate-200 focus:border-brand-600 focus:ring-brand-600/20';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={[
            'block w-full rounded-md border bg-white text-slate-900 shadow-sm',
            'placeholder:text-slate-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
            'h-9 text-sm px-3',
            icon ? 'pl-9' : '',
            iconRight ? 'pr-9' : '',
            borderClass,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {iconRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            {iconRight}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
