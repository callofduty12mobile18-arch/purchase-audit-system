import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Lock body scroll and handle ESC
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus on opening: focus first input in dialog body, or first focusable
    const timer = setTimeout(() => {
      if (dialogRef.current && !dialogRef.current.contains(document.activeElement)) {
        const firstInput = dialogRef.current.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        const firstFocusable = firstInput || dialogRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className={[
          'relative bg-white rounded-xl shadow-modal w-full',
          'flex flex-col max-h-[90vh] animate-slide-in-top',
          sizeClasses[size],
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
