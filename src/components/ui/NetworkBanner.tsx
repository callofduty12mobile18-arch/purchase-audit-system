import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkBanner: React.FC = () => {
  const { isOnline, isSlow, dismissSlowWarning } = useNetworkStatus();

  if (isOnline && !isSlow) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium',
        !isOnline ? 'bg-red-600 text-white' : 'bg-amber-500 text-white',
      ].join(' ')}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>No internet connection — working offline</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Slow connection detected — data may take longer to load</span>
          <button
            type="button"
            onClick={dismissSlowWarning}
            className="ml-2 underline hover:no-underline"
            aria-label="Dismiss slow connection warning"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );
};
