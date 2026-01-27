import React, { useState, useEffect } from 'react';
import { AreaSelector } from './components/AreaSelector';
import { CountdownTimer } from './components/CountdownTimer';
import { useAlerts } from './hooks/useAlerts';
import { useAreas } from './hooks/useAreas';
import { Area } from './types';

const STORAGE_KEY = 'oref-selected-area';

function App() {
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);

  const { areas, isLoading: areasLoading, error: areasError } = useAreas();
  const {
    alerts,
    activeAlert,
    getRemainingTime,
    timeOffset,
    isLoading: alertsLoading,
    error: alertsError
  } = useAlerts(selectedArea?.name || null);

  // Load saved area from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedArea(parsed);
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      setIsSelectingArea(true);
    }
  }, []);

  // Validate saved area against loaded areas
  useEffect(() => {
    if (selectedArea && areas.length > 0) {
      const found = areas.find(a => a.name === selectedArea.name);
      if (found) {
        // Update migun time if changed
        if (found.migun_time !== selectedArea.migun_time) {
          setSelectedArea(found);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
        }
      }
    }
  }, [selectedArea, areas]);

  const handleAreaSelect = (area: Area) => {
    setSelectedArea(area);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(area));
    setIsSelectingArea(false);
  };

  const handleChangeArea = () => {
    setIsSelectingArea(true);
  };

  // Loading state
  if (areasLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>טוען נתונים...</p>
      </div>
    );
  }

  // Error state
  if (areasError) {
    return (
      <div style={styles.errorContainer}>
        <h2>שגיאה בטעינת נתונים</h2>
        <p>{areasError}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          נסה שוב
        </button>
      </div>
    );
  }

  // Area selection screen
  if (!selectedArea || isSelectingArea) {
    return <AreaSelector areas={areas} onSelect={handleAreaSelect} />;
  }

  // Main timer screen
  return (
    <CountdownTimer
      selectedArea={selectedArea}
      activeAlert={activeAlert}
      getRemainingTime={getRemainingTime}
      onChangeArea={handleChangeArea}
      allAlerts={alerts}
      timeOffset={timeOffset}
    />
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    gap: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #333',
    borderTopColor: '#4ade80',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    padding: '20px',
    textAlign: 'center',
    gap: '16px'
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#4ade80',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};

export default App;
