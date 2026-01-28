import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert, Area, NewsFlash } from '../types';
import { useLanguage } from '../i18n';

interface CountdownTimerProps {
  selectedArea: Area;
  activeAlert: Alert | null;
  alertEnded: boolean;  // NEW: true when alert just ended (safe to exit per Pikud HaOref)
  newsFlash: NewsFlash | null;  // Early warning (10 min before strike)
  getRemainingTime: () => number | null;
  onChangeArea: () => void;
  allAlerts: Alert[];
  timeOffset: number;
  isCurrentLocation?: boolean;  // True when showing current location instead of home
}

// Phase definitions for calm UX
type Phase = 'critical' | 'yellow' | 'orange' | 'red' | 'sheltering' | 'canExit' | 'safe' | 'earlyWarning';

interface PhaseConfig {
  color: string;
  backgroundColor: string;
  badgeColor: string;
  textKey: string;
  instructionKey: string;
  // Fallback text for when translations aren't loaded yet
  text: string;
  instruction: string;
}

const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  earlyWarning: {
    color: '#f59e0b',
    backgroundColor: '#451a03',
    badgeColor: '#b45309',
    textKey: 'phase.earlyWarning',
    instructionKey: 'instruction.earlyWarning',
    text: 'התרעה מוקדמת',
    instruction: 'יש להיכנס למרחב מוגן בהקדם'
  },
  safe: {
    color: '#4ade80',
    backgroundColor: '#1a1a2e',
    badgeColor: '#166534',
    textKey: 'phase.safe',
    instructionKey: '',
    text: 'אין התראה פעילה באזור',
    instruction: ''
  },
  critical: {
    color: '#ef4444',
    backgroundColor: '#450a0a',
    badgeColor: '#b91c1c',
    textKey: 'phase.critical',
    instructionKey: 'instruction.critical',
    text: 'הישאר במקום והתכופף',
    instruction: 'התכופף, הגן על הראש, התרחק מחלונות'
  },
  yellow: {
    color: '#fcd34d',
    backgroundColor: '#2e2a1a',
    badgeColor: '#92400e',
    textKey: 'phase.yellow',
    instructionKey: 'instruction.yellow',
    text: 'הזמן להגעה למרחב מוגן מוגבל',
    instruction: 'מומלץ לפעול ברוגע ובשיקול דעת'
  },
  orange: {
    color: '#fb923c',
    backgroundColor: '#2e221a',
    badgeColor: '#9a3412',
    textKey: 'phase.orange',
    instructionKey: 'instruction.orange',
    text: 'הזמן המוערך מתקצר',
    instruction: 'מומלץ לפעול בהתאם להנחיות פיקוד העורף'
  },
  red: {
    color: '#f87171',
    backgroundColor: '#2e1f1f',
    badgeColor: '#991b1b',
    textKey: 'phase.red',
    instructionKey: 'instruction.red',
    text: 'הזמן המוערך הסתיים',
    instruction: 'יש לפעול לפי הנחיות פיקוד העורף'
  },
  sheltering: {
    color: '#60a5fa',
    backgroundColor: '#1e293b',
    badgeColor: '#1e40af',
    textKey: 'phase.sheltering',
    instructionKey: 'instruction.sheltering',
    text: 'מומלץ להישאר במרחב מוגן',
    instruction: 'יש להמתין להודעת פיקוד העורף לפני יציאה'
  },
  canExit: {
    color: '#4ade80',
    backgroundColor: '#1a2e1f',
    badgeColor: '#166534',
    textKey: 'phase.canExit',
    instructionKey: 'instruction.canExit',
    text: 'ניתן לצאת מהמרחב המוגן',
    instruction: 'ההתראה הסתיימה לפי פיקוד העורף'
  }
};


export function CountdownTimer({
  selectedArea,
  activeAlert,
  alertEnded,  // NEW: when true, alert ended per Pikud HaOref
  newsFlash,   // Early warning (10 min before strike)
  getRemainingTime,
  onChangeArea,
  allAlerts,
  timeOffset,
  isCurrentLocation = false
}: CountdownTimerProps) {
  const { t, language } = useLanguage();
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

  // Track sounds separately
  const hasPlayedNewsFlashSound = useRef(false);
  const hasPlayedExitSound = useRef(false);
  const repeatSoundInterval = useRef<NodeJS.Timeout | null>(null);
  const previousNewsFlash = useRef<NewsFlash | null>(null);

  // Vibration helper
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Vibration not supported
    }
  }, []);

  // Voice announcement using Web Speech API (supports Hebrew/English)
  const speak = useCallback((text: string) => {
    try {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'he' ? 'he-IL' : 'en-US';
        utterance.rate = 0.9;
        utterance.volume = 1;

        // Try to find appropriate voice
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = language === 'he' ? 'he' : 'en';
        const matchingVoice = voices.find(v => v.lang.startsWith(langPrefix));
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  }, [language]);

  // Alert notification sound (attention-getting)
  const playAlertSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Alert tone
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);

      // Vibrate: long pulse
      vibrate([300, 100, 300, 100, 300]);
    } catch (e) {
      console.error('Could not play alert sound:', e);
    }
  }, [vibrate]);

  // Full alert with sound + voice (critical mode for short migun times)
  const playFullAlert = useCallback((isCritical: boolean = false) => {
    playAlertSound();
    // Slight delay before voice so sound plays first
    setTimeout(() => {
      if (isCritical) {
        speak(t('voice.braceYourself'));
      } else {
        speak(t('voice.enterShelter'));
      }
    }, 500);
  }, [playAlertSound, speak, t]);

  // Reminder sound (softer, for repeat alerts)
  const playReminderSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      // Softer than main alert
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      vibrate([200, 100, 200]);
    } catch (e) {
      console.error('Could not play reminder sound:', e);
    }
  }, [vibrate]);

  // NewsFlash sound (distinct warning tone - two-tone pattern)
  const playNewsFlashSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // First tone (lower)
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.value = 392; // G4
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.3);

      // Second tone (higher)
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 523; // C5
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7);
      osc2.start(audioContext.currentTime + 0.35);
      osc2.stop(audioContext.currentTime + 0.7);

      // Third tone (even higher for urgency)
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 659; // E5
      osc3.type = 'sine';
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime + 0.75);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.1);
      osc3.start(audioContext.currentTime + 0.75);
      osc3.stop(audioContext.currentTime + 1.1);

      // Vibrate: short pulses (warning pattern)
      vibrate([200, 100, 200, 100, 200]);

      // Voice announcement for early warning
      setTimeout(() => {
        speak(t('voice.earlyWarning'));
      }, 1200);
    } catch (e) {
      console.error('Could not play newsFlash sound:', e);
    }
  }, [vibrate, speak, t]);

  // All clear sound (loud, pleasant ascending chime + voice)
  const playAllClearSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Louder, longer ascending arpeggio (C-E-G-C played twice)
      const frequencies = [523, 659, 784, 1047, 523, 659, 784, 1047]; // C5, E5, G5, C6 x2
      const duration = 0.2;

      frequencies.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';

        const startTime = audioContext.currentTime + (i * duration);
        // Louder volume
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration + 0.15);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.2);
      });

      // Strong vibration for exit
      vibrate([200, 100, 200, 100, 200, 100, 200]);

      // Voice announcement
      setTimeout(() => {
        speak(t('voice.canExit'));
      }, 1800);
    } catch (e) {
      console.error('Could not play all clear sound:', e);
    }
  }, [vibrate, speak, t]);

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

  // Play alert sound + voice when new alert starts
  useEffect(() => {
    if (activeAlert && !hasPlayedSound.current) {
      hasPlayedSound.current = true;
      // Use critical voice for short migun times (≤30 seconds)
      const isCritical = activeAlert.migun_time <= 30;
      playFullAlert(isCritical);
    } else if (!activeAlert) {
      hasPlayedSound.current = false;
    }
  }, [activeAlert, playFullAlert]);

  // Repeat reminder sound while alert is active
  // Interval depends on migun time: 10s for short alerts, 30s for longer ones
  useEffect(() => {
    if (!activeAlert) {
      // Clear interval when no alert
      if (repeatSoundInterval.current) {
        clearInterval(repeatSoundInterval.current);
        repeatSoundInterval.current = null;
      }
      return;
    }

    // Shorter interval for short migun times
    const intervalMs = activeAlert.migun_time <= 30 ? 10000 : 30000;

    repeatSoundInterval.current = setInterval(() => {
      playReminderSound();
    }, intervalMs);

    // Cleanup on unmount or when alert changes
    return () => {
      if (repeatSoundInterval.current) {
        clearInterval(repeatSoundInterval.current);
        repeatSoundInterval.current = null;
      }
    };
  }, [activeAlert, playReminderSound]);

  // Play distinct sound + voice for newsFlash (early warning)
  useEffect(() => {
    if (newsFlash && !hasPlayedNewsFlashSound.current) {
      hasPlayedNewsFlashSound.current = true;
      playNewsFlashSound();
    } else if (!newsFlash) {
      // NewsFlash ended - announce if there's no active alert (threat passed)
      if (previousNewsFlash.current && !activeAlert) {
        speak(t('voice.earlyWarningEnded'));
      }
      hasPlayedNewsFlashSound.current = false;
    }
    previousNewsFlash.current = newsFlash;
  }, [newsFlash, activeAlert, playNewsFlashSound, speak, t]);

  // Play all clear sound + voice when alert ends (canExit phase)
  useEffect(() => {
    if ((isExitState || alertEnded) && !hasPlayedExitSound.current) {
      hasPlayedExitSound.current = true;
      playAllClearSound();
    } else if (!isExitState && !alertEnded) {
      hasPlayedExitSound.current = false;
    }
  }, [isExitState, alertEnded, playAllClearSound]);

  // Determine current phase
  const getPhase = (): Phase => {
    // Priority: Local exit state OR prop
    if (isExitState || alertEnded) return 'canExit';

    // Early warning takes priority (10 min before strike)
    if (newsFlash && !activeAlert) return 'earlyWarning';

    if (!activeAlert) return 'safe';
    if (remainingTime === null) return 'safe';

    // Critical phase for very short migun times (≤15 seconds) - no time to move
    if (activeAlert.migun_time <= 15) {
      return 'critical';
    }

    // If migun time hasn't expired yet, show progress phases
    if (remainingTime > 0) {
      // For short migun times (≤30 seconds), use critical phase throughout
      if (activeAlert.migun_time <= 30) {
        return 'critical';
      }

      const percentRemaining = (remainingTime / activeAlert.migun_time) * 100;

      if (percentRemaining > 50) return 'yellow';
      if (percentRemaining > 25) return 'orange';
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

  // Test alert function removed

  const hasAlert = activeAlert !== null;
  const isExpired = remainingTime !== null && remainingTime <= 0;

  // Calculate progress percentage
  const progress = hasAlert && remainingTime !== null && activeAlert
    ? Math.max(0, (remainingTime / activeAlert.migun_time) * 100)
    : 100;

  // Get phase percentage for display
  const getPhasePercentText = () => {
    if (phase === 'critical') return t('estimate.critical');
    if (phase === 'yellow') return t('estimate.reasonable');
    if (phase === 'orange') return t('estimate.limited');
    if (phase === 'red') return t('estimate.ended');
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
        <div style={styles.areaHeader}>
          <span style={styles.areaName}>{selectedArea.name}</span>
          {isCurrentLocation && (
            <span style={styles.locationBadge}>📍 {t('ui.currentLocation')}</span>
          )}
        </div>
        {!hasAlert && !isCurrentLocation && (
          <button onClick={onChangeArea} style={styles.changeButton}>
            {t('ui.changeArea')}
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
            <>{t('badge.alertActive')}</>
          ) : phase === 'earlyWarning' ? (
            <>{t('badge.earlyWarning')}</>
          ) : (
            <>{config.textKey ? t(config.textKey as any) : config.text}</>
          )}
        </div>
      </div>

      {/* NewsFlash Banner - Early Warning */}
      {newsFlash && (
        <div style={styles.newsFlashBanner}>
          <div style={styles.newsFlashIcon}>⚠️</div>
          <div style={styles.newsFlashContent}>
            <div style={styles.newsFlashTitle}>{t('newsFlash.title')}</div>
            <div style={styles.newsFlashInstructions}>
              {newsFlash.instructions || t('newsFlash.defaultInstruction')}
            </div>
            {newsFlash.areas.length > 0 && (
              <div style={styles.newsFlashAreas}>
                {t('newsFlash.areas')} {newsFlash.areas.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Alert Area */}
      {hasAlert && (
        <div style={styles.alertMessage}>
          <p style={styles.calmInstruction}>
            {phase === 'critical' ? t('alert.criticalInstruction') : t('alert.calmInstruction')}
          </p>
          <p style={styles.reassurance}>
            {t('alert.reassurance')}
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
              {config.textKey ? t(config.textKey as any) : config.text}
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
            {config.instructionKey ? t(config.instructionKey as any) : config.instruction}
          </p>
        ) : (
          <p style={styles.instructionText}>
            {t('ui.migunTime')} <strong>{selectedArea.migun_time} {t('ui.seconds')}</strong>
          </p>
        )}
      </div>

      {/* Reassurance footer */}
      {hasAlert && (
        <div style={styles.reassuranceFooter}>
          <p style={styles.reassuranceText}>
            {t('alert.stayCalm')}
          </p>
          <p style={styles.reassuranceSubtext}>
            {t('alert.estimate')}
          </p>
        </div>
      )}

      {/* Test button removed */}

      {/* Search section removed */}

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        <p style={styles.disclaimerText}>
          {t('disclaimer.text')}
        </p>
      </div>

      {/* NO PULSING OVERLAY - removed for calm UX */}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    flex: 1,
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
  areaHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  areaName: {
    fontSize: '18px',
    fontWeight: 600
  },
  locationBadge: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
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
  },
  newsFlashBanner: {
    margin: '12px 16px',
    padding: '16px',
    backgroundColor: '#451a03',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  newsFlashIcon: {
    fontSize: '28px',
    lineHeight: 1
  },
  newsFlashContent: {
    flex: 1
  },
  newsFlashTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f59e0b',
    marginBottom: '8px'
  },
  newsFlashInstructions: {
    fontSize: '16px',
    color: '#fcd34d',
    lineHeight: 1.4,
    marginBottom: '8px'
  },
  newsFlashAreas: {
    fontSize: '14px',
    color: '#fbbf24',
    opacity: 0.8
  }
};
