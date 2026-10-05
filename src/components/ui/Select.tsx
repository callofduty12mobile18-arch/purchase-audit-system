import { forwardRef, SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { AlertCircle } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Option[];
  placeholder?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder,
  helperText,
  className,
  id,
  required,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-wider text-[#1F1F2C]">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        className={clsx(
          'w-full rounded-xl bg-white border text-[#1F1F2C] text-sm transition-all duration-150 py-2.5 px-3.5 focus:outline-none focus:ring-2 cursor-pointer',
          error
            ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900'
            : 'border-[#D5DCED] hover:border-[#B5C2E0] focus:ring-[#4B49AC]/20 focus:border-[#4B49AC]',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-[#1F1F2C]">
            {opt.label}
          </option>
        ))}
      </select>
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

Select.displayName = 'Select';
