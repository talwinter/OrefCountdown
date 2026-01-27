import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertsResponse } from '../types';

const POLL_INTERVAL = 2000; // Poll every 2 seconds (matches server update rate)
const ALERT_ENDED_DISPLAY_TIME = 60000; // Show "alert ended" message for 60 seconds

export function useAlerts(selectedArea: string | null) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serverTime, setServerTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertEnded, setAlertEnded] = useState(false);
  const [alertEndedAt, setAlertEndedAt] = useState<number | null>(null);
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

  // Detect when alert ends (was active, now gone)
  useEffect(() => {
    const previousAlert = previousAlertRef.current;

    // Debug logging
    console.log('Alert state:', {
      previousAlert: previousAlert?.area,
      activeAlert: activeAlert?.area,
      selectedArea,
      alertEnded
    });

    // If we had an alert before, but now it's gone = alert ended!
    // We don't need to check area name again, because previousAlert only references the alert for this selectedArea
    if (previousAlert && !activeAlert) {
      console.log('🟢 [useAlerts] Alert ended detected!', {
        prev: previousAlert.area,
        current: activeAlert,
        time: new Date().toISOString()
      });
      setAlertEnded(true);
      setAlertEndedAt(Date.now());
    } else if (previousAlert && activeAlert) {
      // Alert still active
      // console.log('Alert still active...');
    } else if (!previousAlert && activeAlert) {
      console.log('🔴 [useAlerts] New alert started:', activeAlert.area);
    }

    // If a new alert starts, clear the "ended" state
    if (activeAlert) {
      if (alertEnded) {
        console.log('New alert started, clearing alertEnded');
      }
      setAlertEnded(false);
      setAlertEndedAt(null);
    }

    // Update previous alert ref
    previousAlertRef.current = activeAlert;
  }, [activeAlert, selectedArea, alertEnded]);

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

  return {
    alerts,
    activeAlert,
    hasAlert,
    alertEnded,  // NEW: true when alert just ended (safe to exit)
    getRemainingTime,
    serverTime,
    timeOffset: timeOffsetRef.current,
    isLoading,
    error
  };
}
