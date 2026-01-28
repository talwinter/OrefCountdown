import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Area } from '../types';

interface CountdownTimerProps {
  selectedArea: Area;
  activeAlert: Alert | null;
  alertEnded: boolean;  // NEW: true when alert just ended (safe to exit per Pikud HaOref)
  getRemainingTime: () => number | null;
  onChangeArea: () => void;
  allAlerts: Alert[];
  timeOffset: number;
}

// Phase definitions for calm UX
type Phase = 'green' | 'yellow' | 'orange' | 'red' | 'sheltering' | 'canExit' | 'safe';

interface PhaseConfig {
  color: string;
  backgroundColor: string;
  badgeColor: string;
  text: string;
  instruction: string;
}

const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  safe: {
    color: '#4ade80',
    backgroundColor: '#1a1a2e',
    badgeColor: '#166534',
    text: 'אין התראה פעילה באזור',
    instruction: ''
  },
  green: {
    color: '#4ade80',
    backgroundColor: '#1a2e1f',
    badgeColor: '#166534',
    text: 'נמצא בטווח הזמן המומלץ',
    instruction: 'להגעה למרחב מוגן לפי הנחיות פיקוד העורף'
  },
  yellow: {
    color: '#fcd34d',
    backgroundColor: '#2e2a1a',
    badgeColor: '#92400e',
    text: 'הזמן להגעה למרחב מוגן מוגבל',
    instruction: 'מומלץ לפעול ברוגע ובשיקול דעת'
  },
  orange: {
    color: '#fb923c',
    backgroundColor: '#2e221a',
    badgeColor: '#9a3412',
    text: 'הזמן המוערך מתקצר',
    instruction: 'מומלץ לפעול בהתאם להנחיות פיקוד העורף'
  },
  red: {
    color: '#f87171',
    backgroundColor: '#2e1f1f',
    badgeColor: '#991b1b',
    text: 'הזמן המוערך הסתיים',
    instruction: 'יש לפעול לפי הנחיות פיקוד העורף'
  },
  sheltering: {
    color: '#60a5fa',
    backgroundColor: '#1e293b',
    badgeColor: '#1e40af',
    text: 'מומלץ להישאר במרחב מוגן',
    instruction: 'יש להמתין להודעת פיקוד העורף לפני יציאה'
  },
  canExit: {
    color: '#4ade80',
    backgroundColor: '#1a2e1f',
    badgeColor: '#166534',
    text: 'ניתן לצאת מהמרחב המוגן',
    instruction: 'ההתראה הסתיימה לפי פיקוד העורף'
  }
};


export function CountdownTimer({
  selectedArea,
  activeAlert,
  alertEnded,  // NEW: when true, alert ended per Pikud HaOref
  getRemainingTime,
  onChangeArea,
  allAlerts,
  timeOffset
}: CountdownTimerProps) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedSound = useRef(false);

  // Track local exit state (when alert disappears)
  const [isExitState, setIsExitState] = useState(false);
  const previousAlertProp = useRef<Alert | null>(null);

  // Version check removed

  // Detect Active -> Inactive transition locally
  useEffect(() => {
    const prev = previousAlertProp.current;
    if (prev && !activeAlert) {
      setIsExitState(true);
      // Auto-clear after 2 minutes (120 seconds) - User request
      setTimeout(() => setIsExitState(false), 120000);
    }
    if (activeAlert) setIsExitState(false);
    previousAlertProp.current = activeAlert;
  }, [activeAlert]);

  // Update remaining time every 100ms for smooth progress
  useEffect(() => {
    const updateTime = () => {
      const time = getRemainingTime();
      setRemainingTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 100);
    return () => clearInterval(interval);
  }, [getRemainingTime]);

  // Play calm notification sound when new alert starts
  useEffect(() => {
    if (activeAlert && !hasPlayedSound.current) {
      hasPlayedSound.current = true;
      playNotificationSound();
    } else if (!activeAlert) {
      hasPlayedSound.current = false;
    }
  }, [activeAlert]);

  // Determine current phase
  const getPhase = (): Phase => {
    // Priority: Local exit state OR prop
    if (isExitState || alertEnded) return 'canExit';

    if (!activeAlert) return 'safe';
    if (remainingTime === null) return 'safe';

    // If migun time hasn't expired yet, show progress phases
    if (remainingTime > 0) {
      const percentRemaining = (remainingTime / activeAlert.migun_time) * 100;

      if (percentRemaining > 60) return 'green';
      if (percentRemaining > 30) return 'yellow';
      if (percentRemaining > 15) return 'orange';
      return 'red';
    }

    // Migun time expired - wait for Pikud HaOref announcement
    return 'sheltering';
  };

  const phase = getPhase();

  // Debug logs removed

  const config = PHASE_CONFIGS[phase];

  // Calculate remaining time for any alert
  const getAlertRemainingTime = useCallback((alert: Alert) => {
    const now = Date.now() + timeOffset;
    const elapsed = (now - alert.started_at) / 1000;
    return Math.max(0, alert.migun_time - elapsed);
  }, [timeOffset]);

  // Search logic removed

  // Calm notification sound (softer than alarm)
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Lower, calmer frequency
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      // Gentler volume curve
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      console.error('Could not play notification sound:', e);
    }
  }, []);

  // Test alert function removed

  const hasAlert = activeAlert !== null;
  const isExpired = remainingTime !== null && remainingTime <= 0;

  // Calculate progress percentage
  const progress = hasAlert && remainingTime !== null && activeAlert
    ? Math.max(0, (remainingTime / activeAlert.migun_time) * 100)
    : 100;

  // Get phase percentage for display
  const getPhasePercentText = () => {
    if (phase === 'green') return 'הערכה: זמן מספיק';
    if (phase === 'yellow') return 'הערכה: זמן סביר';
    if (phase === 'orange') return 'הערכה: זמן מוגבל';
    if (phase === 'red') return 'הערכה: הזמן הסתיים';
    if (phase === 'sheltering') return '';
    return '';
  };

  return (
    <div style={{
      ...styles.container,
      backgroundColor: config.backgroundColor,
      transition: 'background-color 2s ease'
    }}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.areaName}>{selectedArea.name}</span>
        {!hasAlert && (
          <button onClick={onChangeArea} style={styles.changeButton}>
            החלף אזור
          </button>
        )}
      </div>

      {/* Status Badge */}
      <div style={styles.statusContainer}>
        <div style={{
          ...styles.statusBadge,
          backgroundColor: config.badgeColor,
          transition: 'background-color 2s ease'
        }}>
          {hasAlert ? (
            <>אזעקה נשמעה באזור</>
          ) : (
            <>{config.text}</>
          )}
        </div>
      </div>

      {/* Main Alert Area */}
      {hasAlert && (
        <div style={styles.alertMessage}>
          <p style={styles.calmInstruction}>
            לפי הנחיות פיקוד העורף, קיים פרק זמן מוגדר להגעה למרחב מוגן באזור זה
          </p>
          <p style={styles.reassurance}>
            מומלץ לפעול ברוגע ובהתאם ליכולת האישית
          </p>
        </div>
      )}

      {/* Phase Progress Circle */}
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
              stroke={config.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 2s ease' }}
            />
          </svg>

          {/* Phase display - NO NUMERIC COUNTDOWN */}
          <div style={styles.phaseDisplay}>
            <span style={{
              ...styles.phaseText,
              color: config.color,
              transition: 'color 2s ease'
            }}>
              {config.text}
            </span>
            {hasAlert && !isExpired && (
              <span style={styles.phaseSubtext}>
                {getPhasePercentText()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        {(hasAlert || phase === 'canExit') ? (
          <p style={styles.instructionText}>
            {config.instruction}
          </p>
        ) : (
          <p style={styles.instructionText}>
            זמן המיגון באזור שלך: <strong>{selectedArea.migun_time} שניות</strong>
          </p>
        )}
      </div>

      {/* Reassurance footer */}
      {hasAlert && (
        <div style={styles.reassuranceFooter}>
          <p style={styles.reassuranceText}>
            שמירה על קור רוח חשובה לבטיחותך
          </p>
          <p style={styles.reassuranceSubtext}>
            מדובר בהערכה כללית בהתאם לאזור ולהנחיות פיקוד העורף
          </p>
        </div>
      )}

      {/* Test button removed */}

      {/* Search section removed */}

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        <p style={styles.disclaimerText}>
          המידע מבוסס על נתונים ציבוריים מפיקוד העורף ומוצג כהערכה כללית בלבד.
          <br />
          אין מדובר בשירות חירום רשמי. יש לפעול תמיד לפי הנחיות פיקוד העורף.
        </p>
      </div>

      {/* NO PULSING OVERLAY - removed for calm UX */}
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
    overflow: 'auto'
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
  alertMessage: {
    padding: '0 20px',
    textAlign: 'center'
  },
  calmInstruction: {
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: '#ffffff'
  },
  reassurance: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: 0
  },
  timerContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    minHeight: '200px'
  },
  timerCircle: {
    position: 'relative',
    width: '220px',
    height: '220px',
    maxWidth: '60vw',
    maxHeight: '60vw'
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  },
  phaseDisplay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    width: '80%'
  },
  phaseText: {
    display: 'block',
    fontSize: '22px',
    fontWeight: 700,
    lineHeight: 1.3
  },
  phaseSubtext: {
    display: 'block',
    fontSize: '14px',
    color: '#888',
    marginTop: '8px'
  },
  instructions: {
    padding: '16px 20px',
    textAlign: 'center'
  },
  instructionText: {
    fontSize: '16px',
    lineHeight: 1.5,
    margin: 0,
    color: '#d1d5db'
  },
  reassuranceFooter: {
    padding: '16px 20px',
    textAlign: 'center',
    borderTop: '1px solid #333',
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  reassuranceText: {
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 4px 0',
    color: '#94a3b8'
  },
  reassuranceSubtext: {
    fontSize: '14px',
    margin: 0,
    color: '#64748b'
  },
  footer: {
    padding: '12px 16px',
    textAlign: 'center'
  },
  testButton: {
    padding: '10px 20px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    fontSize: '14px',
    cursor: 'pointer'
  },
  searchSection: {
    padding: '12px 16px',
    borderTop: '1px solid #333'
  },
  searchToggle: {
    width: '100%',
    padding: '10px',
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
    maxHeight: '120px',
    overflowY: 'auto'
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '8px'
  },
  searchResultArea: {
    fontSize: '14px',
    fontWeight: 500
  },
  searchResultStatus: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e2e8f0'
  },
  noResults: {
    padding: '12px',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px'
  },
  disclaimer: {
    padding: '12px 16px',
    borderTop: '1px solid #333',
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  disclaimerText: {
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5
  }
};
