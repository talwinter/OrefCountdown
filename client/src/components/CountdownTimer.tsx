import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Area } from '../types';

interface CountdownTimerProps {
  selectedArea: Area;
  activeAlert: Alert | null;
  getRemainingTime: () => number | null;
  onChangeArea: () => void;
  allAlerts: Alert[];
  timeOffset: number;
}

export function CountdownTimer({
  selectedArea,
  activeAlert,
  getRemainingTime,
  onChangeArea,
  allAlerts,
  timeOffset
}: CountdownTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedSiren = useRef(false);

  // Update remaining time every 100ms for smooth countdown
  useEffect(() => {
    const updateTime = () => {
      const time = getRemainingTime();
      setRemainingTime(time);
      setIsExpired(time !== null && time <= 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [getRemainingTime]);

  // Play alert sound when new alert starts
  useEffect(() => {
    if (activeAlert && !hasPlayedSiren.current) {
      hasPlayedSiren.current = true;
      playAlertSound();
    } else if (!activeAlert) {
      hasPlayedSiren.current = false;
    }
  }, [activeAlert]);

  // Calculate remaining time for any alert
  const getAlertRemainingTime = useCallback((alert: Alert) => {
    const now = Date.now() + timeOffset;
    const elapsed = (now - alert.started_at) / 1000;
    return Math.max(0, alert.migun_time - elapsed);
  }, [timeOffset]);

  // Filter alerts based on search query
  const searchResults = searchQuery.trim()
    ? allAlerts.filter(alert =>
        alert.area.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  const playAlertSound = useCallback(() => {
    // Create oscillator for alert beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.error('Could not play alert sound:', e);
    }
  }, []);

  // Trigger test alert
  const triggerTestAlert = async () => {
    try {
      await fetch(`/api/test-alert?area=${encodeURIComponent(selectedArea.name)}&test=true`);
    } catch (e) {
      console.error('Failed to trigger test alert:', e);
    }
  };

  const hasAlert = activeAlert !== null;
  const displayTime = remainingTime !== null ? Math.ceil(remainingTime) : selectedArea.migun_time;

  // Calculate progress percentage
  const progress = hasAlert && remainingTime !== null
    ? (remainingTime / activeAlert.migun_time) * 100
    : 100;

  // Determine urgency colors
  const getUrgencyColor = () => {
    if (!hasAlert) return '#4ade80'; // Green - safe
    if (isExpired) return '#ef4444'; // Red - expired
    if (remainingTime !== null && remainingTime <= 5) return '#ef4444'; // Red - critical
    if (remainingTime !== null && remainingTime <= 15) return '#f97316'; // Orange - urgent
    return '#fbbf24'; // Yellow - warning
  };

  const urgencyColor = getUrgencyColor();

  return (
    <div style={{
      ...styles.container,
      backgroundColor: hasAlert ? (isExpired ? '#2d1f1f' : '#2d2d1f') : '#1a1a2e'
    }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.areaName}>{selectedArea.name}</span>
        <button onClick={onChangeArea} style={styles.changeButton}>
          החלף אזור
        </button>
      </div>

      {/* Status */}
      <div style={styles.statusContainer}>
        <div style={{
          ...styles.statusBadge,
          backgroundColor: hasAlert ? (isExpired ? '#7f1d1d' : '#854d0e') : '#166534'
        }}>
          {hasAlert
            ? (isExpired ? 'הגיע הזמן להיכנס!' : 'התראה פעילה!')
            : 'אין התראה פעילה'}
        </div>
      </div>

      {/* Timer Circle */}
      <div style={styles.timerContainer}>
        <div style={styles.timerCircle}>
          {/* Progress ring */}
          <svg style={styles.progressRing} viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#333"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={urgencyColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>

          {/* Time display */}
          <div style={styles.timeDisplay}>
            <span style={{
              ...styles.timeNumber,
              color: urgencyColor
            }}>
              {displayTime}
            </span>
            <span style={styles.timeLabel}>שניות</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        {hasAlert ? (
          isExpired ? (
            <p style={styles.instructionText}>
              <strong>היכנס למרחב המוגן עכשיו!</strong>
            </p>
          ) : (
            <p style={styles.instructionText}>
              יש לך <strong>{displayTime} שניות</strong> להיכנס למרחב המוגן
            </p>
          )
        ) : (
          <p style={styles.instructionText}>
            זמן המיגון באזור שלך: <strong>{selectedArea.migun_time} שניות</strong>
          </p>
        )}
      </div>

      {/* Test button */}
      <div style={styles.footer}>
        <button onClick={triggerTestAlert} style={styles.testButton}>
          בדיקת התראה
        </button>
      </div>

      {/* Search other areas section */}
      <div style={styles.searchSection}>
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          style={styles.searchToggle}
        >
          🔍 בדוק אזור אחר {isSearchOpen ? '▲' : '▼'}
        </button>

        {isSearchOpen && (
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="חפש עיר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
              dir="rtl"
            />

            {searchQuery.trim() && (
              <div style={styles.searchResults}>
                {searchResults.length > 0 ? (
                  searchResults.map((alert) => (
                    <div key={alert.area} style={styles.searchResultItem}>
                      <span style={styles.searchResultArea}>{alert.area}</span>
                      <span style={styles.searchResultTime}>
                        {Math.ceil(getAlertRemainingTime(alert))} שניות
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={styles.noResults}>
                    אין התראה פעילה ב{searchQuery}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pulsing overlay for active alerts */}
      {hasAlert && !isExpired && (
        <div style={{
          ...styles.pulseOverlay,
          animation: 'pulse 1s infinite'
        }} />
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0; }
            50% { opacity: 0.1; }
          }
        `}
      </style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.3s'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #333'
  },
  areaName: {
    fontSize: '18px',
    fontWeight: 600
  },
  changeButton: {
    padding: '8px 16px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer'
  },
  statusContainer: {
    padding: '16px',
    textAlign: 'center'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: 600
  },
  timerContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  timerCircle: {
    position: 'relative',
    width: '250px',
    height: '250px',
    maxWidth: '70vw',
    maxHeight: '70vw'
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  timeDisplay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center'
  },
  timeNumber: {
    display: 'block',
    fontSize: '72px',
    fontWeight: 900,
    lineHeight: 1
  },
  timeLabel: {
    display: 'block',
    fontSize: '18px',
    color: '#888',
    marginTop: '8px'
  },
  instructions: {
    padding: '20px',
    textAlign: 'center'
  },
  instructionText: {
    fontSize: '18px',
    lineHeight: 1.5
  },
  footer: {
    padding: '16px',
    textAlign: 'center'
  },
  testButton: {
    padding: '12px 24px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer'
  },
  pulseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ef4444',
    pointerEvents: 'none'
  },
  searchSection: {
    padding: '16px',
    borderTop: '1px solid #333'
  },
  searchToggle: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  },
  searchContainer: {
    marginTop: '12px'
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2d2d44',
    border: '1px solid #444',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  searchResults: {
    marginTop: '12px',
    maxHeight: '150px',
    overflowY: 'auto'
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#854d0e',
    borderRadius: '8px',
    marginBottom: '8px'
  },
  searchResultArea: {
    fontSize: '14px',
    fontWeight: 500
  },
  searchResultTime: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fbbf24'
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px'
  }
};
