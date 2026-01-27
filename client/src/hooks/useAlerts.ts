import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertsResponse } from '../types';

const POLL_INTERVAL = 1000; // Poll every second for responsive UI

export function useAlerts(selectedArea: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeOffsetRef = useRef<number>(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      const data: AlertsResponse = await response.json();

      // Calculate time offset between client and server
      const clientTime = Date.now();
      timeOffsetRef.current = data.server_time - clientTime;

      setAlerts(data.alerts);
      setServerTime(data.server_time);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Find alert for selected area
  const activeAlert = selectedArea
    ? alerts.find(alert => alert.area === selectedArea) ?? null
    : null;

  // Check if any alert exists for the selected area
  const hasAlert = !!activeAlert;

  // Calculate remaining time
  const getRemainingTime = useCallback(() => {
    if (!activeAlert) return null;

    const now = Date.now() + timeOffsetRef.current;
    const elapsed = (now - activeAlert.started_at) / 1000;
    const remaining = activeAlert.migun_time - elapsed;

    return Math.max(0, remaining);
  }, [activeAlert]);

  return {
    alerts,
    activeAlert,
    hasAlert,
    getRemainingTime,
    serverTime,
    timeOffset: timeOffsetRef.current,
    isLoading,
    error
  };
}
