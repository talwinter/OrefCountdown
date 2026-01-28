import React from 'react';

interface LocationToggleProps {
  activeView: 'home' | 'current';
  onToggle: (view: 'home' | 'current') => void;
  homeHasAlert: boolean;
  currentHasAlert: boolean;
  disabled?: boolean;
  currentLocationName?: string;
}

export function LocationToggle({
  activeView,
  onToggle,
  homeHasAlert,
  currentHasAlert,
  disabled = false,
  currentLocationName
}: LocationToggleProps) {
  return (
    <div style={styles.container}>
      <div style={{
        ...styles.toggle,
        opacity: disabled ? 0.5 : 1
      }}>
        <button
          onClick={() => !disabled && onToggle('home')}
          style={{
            ...styles.button,
            ...(activeView === 'home' ? styles.activeButton : styles.inactiveButton)
          }}
          disabled={disabled}
        >
          <span style={styles.buttonIcon}>🏠</span>
          <span style={styles.buttonText}>בית</span>
          {homeHasAlert && <span style={styles.alertDot} />}
        </button>
        <button
          onClick={() => !disabled && onToggle('current')}
          style={{
            ...styles.button,
            ...(activeView === 'current' ? styles.activeButton : styles.inactiveButton)
          }}
          disabled={disabled}
        >
          <span style={styles.buttonIcon}>📍</span>
          <span style={styles.buttonText}>
            {currentLocationName ? currentLocationName.substring(0, 12) : 'מיקום נוכחי'}
          </span>
          {currentHasAlert && <span style={styles.alertDot} />}
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 16px'
  },
  toggle: {
    display: 'flex',
    backgroundColor: '#1e1e2e',
    borderRadius: '24px',
    padding: '4px',
    border: '1px solid #333'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    border: 'none',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s ease'
  },
  activeButton: {
    backgroundColor: '#2d2d44',
    color: '#ffffff'
  },
  inactiveButton: {
    backgroundColor: 'transparent',
    color: '#64748b'
  },
  buttonIcon: {
    fontSize: '14px'
  },
  buttonText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '80px'
  },
  alertDot: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  }
};
