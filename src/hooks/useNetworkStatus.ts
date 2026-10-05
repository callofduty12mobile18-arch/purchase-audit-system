import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  rtt?: number; // Round trip time in ms
  downlink?: number; // Megabits per second
  checkConnection: () => Promise<boolean>;
  dismissSlowWarning: () => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSlow, setIsSlow] = useState<boolean>(false);
  const [dismissedSlow, setDismissedSlow] = useState<boolean>(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
    rtt?: number;
    downlink?: number;
  }>({});

  const evaluateConnection = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      const effType = connection.effectiveType || 'unknown';
      const rtt = connection.rtt || 0;
      const downlink = connection.downlink || 0;

      setConnectionInfo({
        effectiveType: effType,
        rtt,
        downlink,
      });

      // Connection is considered slow if 2G / slow-2g or RTT is > 1500ms or downlink < 0.5 Mbps
      const isConnectionSlow =
        effType === 'slow-2g' ||
        effType === '2g' ||
        (rtt > 1500 && rtt < 10000) ||
        (downlink > 0 && downlink < 0.5);

      if (!dismissedSlow) {
        setIsSlow(isConnectionSlow);
      }
    }
  }, [dismissedSlow]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    try {
      // Ping check to test actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const startTime = performance.now();
      const response = await fetch('/favicon.ico?_cache_bust=' + Date.now(), {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      const duration = performance.now() - startTime;

      const online = response.ok || response.status === 304 || response.type === 'opaque';
      setIsOnline(online);

      if (duration > 2500 && !dismissedSlow) {
        setIsSlow(true);
      } else if (duration <= 1000) {
        setIsSlow(false);
      }

      return online;
    } catch {
      // If HEAD request timed out or failed
      const online = typeof navigator !== 'undefined' ? navigator.onLine : false;
      setIsOnline(online);
      return online;
    }
  }, [dismissedSlow]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      evaluateConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSlow(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      connection.addEventListener?.('change', evaluateConnection);
    }

    evaluateConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener?.('change', evaluateConnection);
      }
    };
  }, [evaluateConnection]);

  const dismissSlowWarning = useCallback(() => {
    setIsSlow(false);
    setDismissedSlow(true);
  }, []);

  return {
    isOnline,
    isSlow: !dismissedSlow && isSlow,
    effectiveType: connectionInfo.effectiveType,
    rtt: connectionInfo.rtt,
    downlink: connectionInfo.downlink,
    checkConnection,
    dismissSlowWarning,
  };
}
