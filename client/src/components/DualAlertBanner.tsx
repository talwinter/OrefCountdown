import React from 'react';

interface DualAlertBannerProps {
  homeAreaName: string;
  currentAreaName: string;
  activeView: 'home' | 'current';
  onSwitchView: () => void;
}

export function DualAlertBanner({
  homeAreaName,
  currentAreaName,
  activeView,
  onSwitchView
}: DualAlertBannerProps) {
  const otherArea = activeView === 'home' ? currentAreaName : homeAreaName;
  const otherLabel = activeView === 'home' ? 'מיקום נוכחי' : 'בית';

  return (
    <div style={styles.banner} onClick={onSwitchView}>
      <div style={styles.alertIcon}>⚠️</div>
      <div style={styles.content}>
        <span style={styles.text}>
          התרעה פעילה גם ב{otherLabel}: <strong>{otherArea}</strong>
        </span>
        <span style={styles.switchText}>הקש למעבר</span>
      </div>
      <div style={styles.arrow}>←</div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#7c2d12',
    borderBottom: '1px solid #9a3412',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  alertIcon: {
    fontSize: '20px'
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  text: {
    fontSize: '14px',
    color: '#fed7aa'
  },
  switchText: {
    fontSize: '12px',
    color: '#fdba74'
  },
  arrow: {
    fontSize: '18px',
    color: '#fdba74'
  }
};
