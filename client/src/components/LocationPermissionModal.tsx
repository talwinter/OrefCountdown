import React from 'react';

interface LocationPermissionModalProps {
  onApprove: () => void;
  onDismiss: () => void;
}

export function LocationPermissionModal({ onApprove, onDismiss }: LocationPermissionModalProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.icon}>📍</div>
        <h2 style={styles.title}>הצגת התראות לפי מיקום</h2>
        <p style={styles.description}>
          האפליקציה יכולה להציג התראות גם לפי המיקום הנוכחי שלך, בנוסף לאזור הבית שבחרת.
        </p>
        <p style={styles.privacy}>
          משמש רק להצגת התראות באזור הנוכחי שלך.
          <br />
          המיקום נשמר במכשיר בלבד ולא נשלח לשום מקום.
        </p>
        <div style={styles.buttons}>
          <button onClick={onApprove} style={styles.approveButton}>
            אשר מיקום
          </button>
          <button onClick={onDismiss} style={styles.dismissButton}>
            לא עכשיו
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#1e1e2e',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '340px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid #333'
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '12px'
  },
  description: {
    fontSize: '15px',
    color: '#d1d5db',
    lineHeight: 1.5,
    marginBottom: '12px'
  },
  privacy: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginBottom: '24px'
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  approveButton: {
    padding: '14px 24px',
    backgroundColor: '#4ade80',
    border: 'none',
    borderRadius: '10px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  dismissButton: {
    padding: '14px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer'
  }
};
