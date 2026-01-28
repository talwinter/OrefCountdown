import React from 'react';
import { useLanguage } from '../i18n';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div style={styles.container}>
      <button
        onClick={() => setLanguage('he')}
        style={{
          ...styles.button,
          ...(language === 'he' ? styles.activeButton : styles.inactiveButton)
        }}
      >
        עברית
      </button>
      <button
        onClick={() => setLanguage('en')}
        style={{
          ...styles.button,
          ...(language === 'en' ? styles.activeButton : styles.inactiveButton)
        }}
      >
        English
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    gap: '6px'
  },
  button: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  activeButton: {
    backgroundColor: '#4ade80',
    color: '#000'
  },
  inactiveButton: {
    backgroundColor: '#2d2d44',
    color: '#94a3b8'
  }
};
