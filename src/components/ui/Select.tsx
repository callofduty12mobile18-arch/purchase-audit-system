import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const borderClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : 'border-slate-200 focus:border-brand-600 focus:ring-brand-600/20';

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          className={[
            'block w-full appearance-none rounded-md border bg-white text-slate-900 shadow-sm',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2',
            'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
            'h-9 text-sm pl-3 pr-9',
            borderClass,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {error && (
        <p id={`${selectId}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${selectId}-helper`} className="mt-1.5 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
};
