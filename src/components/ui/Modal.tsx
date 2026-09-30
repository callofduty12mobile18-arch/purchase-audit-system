import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl h-[90vh]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <button type="button" className="absolute inset-0" aria-label="Close dialog" onClick={onClose} />
      <div
        className={`relative w-full bg-white border border-[#ECEEF5] rounded-t-3xl sm:rounded-2xl shadow-skydash-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] ${sizeClasses[size]}`}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-[#ECEEF5] bg-[#F5F7FF]/50">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#1F1F2C] tracking-tight leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-[#6C7383] mt-0.5">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="shrink-0 text-[#8F93A0] hover:text-[#4B49AC] rounded-full p-1.5">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-6 py-4 border-t border-[#ECEEF5] bg-[#F5F7FF]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
