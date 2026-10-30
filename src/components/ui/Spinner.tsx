import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <Loader2
      className={`animate-spin text-brand-600 ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  );
};
