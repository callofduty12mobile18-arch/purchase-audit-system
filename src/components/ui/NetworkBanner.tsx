import React, { useState } from 'react';
import { WifiOff, AlertTriangle, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkBanner: React.FC = () => {
  const { isOnline, isSlow, checkConnection, dismissSlowWarning } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    const online = await checkConnection();
    setIsChecking(false);
    if (online) {
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    }
  };

  if (justReconnected) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="no-print bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md transition-all z-50 sticky top-0"
      >
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
          <span>Connection Restored — You are back online! Cloud sync is active.</span>
        </div>
      </aside>
    );
  }

  if (!isOnline) {
    return (
      <aside
        role="alert"
        aria-live="assertive"
        className="no-print bg-rose-600 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between shadow-lg z-50 sticky top-0 animate-in slide-in-from-top duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-lg bg-rose-700/80 border border-rose-500 text-white shrink-0">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <strong className="font-bold tracking-wide uppercase text-[11px] mr-1.5 bg-rose-800/90 px-1.5 py-0.5 rounded text-rose-100">
                Offline Mode
              </strong>
              <span>You have lost internet connection. Saved changes may not sync to Supabase database.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleRetry}
              disabled={isChecking}
              className="px-3 py-1 bg-white text-rose-700 font-bold rounded-lg text-xs hover:bg-rose-50 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Check Connection'}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (isSlow) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="no-print bg-amber-500 text-slate-900 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-40 sticky top-0 animate-in slide-in-from-top duration-300"
      >
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-950 shrink-0" />
            <span className="text-amber-950">
              <strong>Slow Network Detected:</strong> High latency on connection. Loading records and saving invoices may take a few extra moments.
            </span>
          </div>

          <button
            onClick={dismissSlowWarning}
            className="p-1 rounded-md text-amber-950 hover:bg-amber-600/30 transition-colors"
            title="Dismiss warning"
            aria-label="Dismiss slow network alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return null;
};
