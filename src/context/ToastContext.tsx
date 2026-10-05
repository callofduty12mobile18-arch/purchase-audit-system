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
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'success', title, message, duration });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'error', title, message, duration: duration || 5000 });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'warning', title, message, duration });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      showToast({ type: 'info', title, message, duration });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed top-4 sm:top-auto sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[99999] flex flex-col gap-2.5 max-w-md sm:max-w-sm w-auto pointer-events-none"
    >
      {toasts.map((toast) => {
        let borderClass = 'border-[#ECEEF5]';
        let bgClass = 'bg-white';
        let icon = <Info className="w-5 h-5 text-[#4B49AC]" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-300 shadow-emerald-500/10';
          bgClass = 'bg-white/95 text-emerald-950';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-300 shadow-rose-500/10';
          bgClass = 'bg-white/95 text-rose-950';
          icon = <XCircle className="w-5 h-5 text-rose-600" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-300 shadow-amber-500/10';
          bgClass = 'bg-white/95 text-amber-950';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${bgClass} ${borderClass} animate-in slide-in-from-top-4 sm:slide-in-from-bottom-5 duration-200`}
          >
            <div className="shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-[#1F1F2C] leading-snug">
                {toast.title}
              </h5>
              {toast.message && (
                <p className="text-xs text-[#6C7383] mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 text-[#8F93A0] hover:text-[#1F1F2C] rounded-lg hover:bg-black/5 transition-colors shrink-0 -mr-1 -mt-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
