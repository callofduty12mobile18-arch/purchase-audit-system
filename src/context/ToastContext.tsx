import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      if (duration > 0) setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string, duration?: number) =>
    showToast({ type: 'success', title, message, duration }), [showToast]);

  const error = useCallback((title: string, message?: string, duration?: number) =>
    showToast({ type: 'error', title, message, duration: duration ?? 6000 }), [showToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) =>
    showToast({ type: 'warning', title, message, duration }), [showToast]);

  const info = useCallback((title: string, message?: string, duration?: number) =>
    showToast({ type: 'info', title, message, duration }), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// ─── Toast container ────────────────────────────────────────────────────────

const toastConfig: Record<
  ToastType,
  { icon: React.ElementType; iconClass: string; borderClass: string }
> = {
  success: { icon: CheckCircle2, iconClass: 'text-green-500',  borderClass: 'border-green-200' },
  error:   { icon: XCircle,      iconClass: 'text-red-500',    borderClass: 'border-red-200'   },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-500', borderClass: 'border-amber-200' },
  info:    { icon: Info,          iconClass: 'text-brand-500', borderClass: 'border-brand-200' },
};

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className={[
        'no-print fixed z-[99999] flex flex-col gap-2 pointer-events-none',
        // Mobile: top-center; Desktop: bottom-right
        'top-4 left-4 right-4 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:w-80',
      ].join(' ')}
    >
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            role="status"
            className={[
              'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border bg-white shadow-dropdown',
              'animate-slide-in-top',
              config.borderClass,
            ].join(' ')}
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors pointer-events-auto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
