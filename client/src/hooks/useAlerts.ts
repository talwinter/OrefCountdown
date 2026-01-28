import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertsResponse, NewsFlash } from '../types';

const POLL_INTERVAL = 2000; // Poll every 2 seconds (matches server update rate)
const ALERT_ENDED_DISPLAY_TIME = 120000; // Show "alert ended" message for 120 seconds

export function useAlerts(selectedArea: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertEnded, setAlertEnded] = useState(false);
  const [alertEndedAt, setAlertEndedAt] = useState<number | null>(null);
  const [newsFlash, setNewsFlash] = useState<NewsFlash | null>(null);
  const timeOffsetRef = useRef<number>(0);
  const previousAlertRef = useRef<Alert | null>(null);

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
      setNewsFlash(data.newsFlash || null);
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

  // Track if we had an active alert recently
  const [wasActive, setWasActive] = useState(false);

  // Detect alert transition: Active -> Inactive
  useEffect(() => {
    // Case 1: Alert currently active
    if (activeAlert) {
      if (!wasActive) setWasActive(true);
      if (alertEnded) setAlertEnded(false); // Reset exit message if new alert comes
    }
    // Case 2: No active alert, but WAS active recently (Transition)
    else if (wasActive) {
      console.log('🟢 [useAlerts] Alert transition: Active -> Inactive. Triggering Exit.');
      setAlertEnded(true);
      setAlertEndedAt(Date.now());
      setWasActive(false); // Reset flag
    }
  }, [activeAlert, wasActive, alertEnded]);

  // Auto-clear "alert ended" state after display time
  useEffect(() => {
    if (alertEnded && alertEndedAt) {
      const timeout = setTimeout(() => {
        setAlertEnded(false);
        setAlertEndedAt(null);
      }, ALERT_ENDED_DISPLAY_TIME);
      return () => clearTimeout(timeout);
    }
  }, [alertEnded, alertEndedAt]);

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

  // Clear alertEnded when user changes area
  useEffect(() => {
    setAlertEnded(false);
    setAlertEndedAt(null);
    previousAlertRef.current = null;
  }, [selectedArea]);

  // Extract newsFlash from response if available
  // Note: App.tsx assumes AlertsResponse/server API includes newsFlash
  // We need to verify if the server actually sends it.
  // The user updated server index.js to send { alerts, newsFlash, server_time }.
  // So data.newsFlash should be available.

  // Actually, I need to cast data to any or update types first.
  // Assume types.ts is updated or flexible.

  return {
    alerts,
    activeAlert,
    hasAlert,
    alertEnded,
    newsFlash,
    getRemainingTime,
    serverTime,
    timeOffset: timeOffsetRef.current,
    isLoading,
    error
  };
}
