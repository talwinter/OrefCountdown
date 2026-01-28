import React, { useState, useEffect, useCallback } from 'react';
import { AreaSelector } from './components/AreaSelector';
import { CountdownTimer } from './components/CountdownTimer';
import { LocationPermissionModal } from './components/LocationPermissionModal';
import { LocationToggle } from './components/LocationToggle';
import { DualAlertBanner } from './components/DualAlertBanner';
import { LanguageSelector } from './components/LanguageSelector';
import { useAlerts } from './hooks/useAlerts';
import { useAreas } from './hooks/useAreas';
import { useCitiesGeo } from './hooks/useCitiesGeo';
import { useGeolocation } from './hooks/useGeolocation';
import { useLanguage } from './i18n';
import { Area } from './types';

const STORAGE_KEY = 'oref-selected-area';

function App() {
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'current'>('home');

  const { isRTL, t } = useLanguage();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'he' : 'en';
  }, [isRTL]);

  const { areas, isLoading: areasLoading, error: areasError } = useAreas();
  const { citiesGeo } = useCitiesGeo();
  const {
    locationState,
    hasAskedPermission,
    requestLocation,
    dismissPermission
  } = useGeolocation(citiesGeo);

  // Alerts for home area
  const {
    alerts: homeAlerts,
    activeAlert: homeActiveAlert,
    alertEnded: homeAlertEnded,
    newsFlash: homeNewsFlash,
    getRemainingTime: homeGetRemainingTime,
    timeOffset: homeTimeOffset
  } = useAlerts(selectedArea?.name || null);

  // Alerts for current location (only if different from home)
  const currentAreaName = locationState.nearestCity?.name || null;
  const isSameAsHome = currentAreaName === selectedArea?.name;

  const {
    alerts: currentAlerts,
    activeAlert: currentActiveAlert,
    alertEnded: currentAlertEnded,
    newsFlash: currentNewsFlash,
    getRemainingTime: currentGetRemainingTime,
    timeOffset: currentTimeOffset
  } = useAlerts(isSameAsHome ? null : currentAreaName);

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

  const handleToggleView = useCallback((view: 'home' | 'current') => {
    setActiveView(view);
  }, []);

  const handleSwitchView = useCallback(() => {
    setActiveView(prev => prev === 'home' ? 'current' : 'home');
  }, []);

  // Determine what to display based on active view
  const displayArea = activeView === 'home'
    ? selectedArea
    : locationState.nearestCity;

  const displayActiveAlert = activeView === 'home'
    ? homeActiveAlert
    : currentActiveAlert;

  const displayAlertEnded = activeView === 'home'
    ? homeAlertEnded
    : currentAlertEnded;

  const displayNewsFlash = activeView === 'home'
    ? homeNewsFlash
    : currentNewsFlash;

  const displayGetRemainingTime = activeView === 'home'
    ? homeGetRemainingTime
    : currentGetRemainingTime;

  const displayTimeOffset = activeView === 'home'
    ? homeTimeOffset
    : currentTimeOffset;

  const displayAlerts = activeView === 'home'
    ? homeAlerts
    : currentAlerts;

  // Check if both locations have alerts
  const bothHaveAlerts = homeActiveAlert !== null && currentActiveAlert !== null && !isSameAsHome;

  // Should show location toggle (has valid current location different from home)
  const showLocationToggle = locationState.permission === 'granted'
    && locationState.nearestCity !== null
    && !isSameAsHome;

  // Should show permission modal
  const showPermissionModal = selectedArea
    && !isSelectingArea
    && !hasAskedPermission
    && locationState.permission === 'prompt';

  // Loading state
  if (areasLoading) {
    return (
      <div style={styles.loadingContainer}>
        <LanguageSelector />
        <div style={styles.spinner} />
        <p>{t('ui.loading')}</p>
      </div>
    );
  }

  // Error state
  if (areasError) {
    return (
      <div style={styles.errorContainer}>
        <LanguageSelector />
        <h2>{t('ui.error')}</h2>
        <p>{areasError}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          {t('ui.retry')}
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
    <div style={styles.mainContainer}>
      {/* Location Permission Modal */}
      {showPermissionModal && (
        <LocationPermissionModal
          onApprove={requestLocation}
          onDismiss={dismissPermission}
        />
      )}

      {/* Dual Alert Banner */}
      {bothHaveAlerts && selectedArea && locationState.nearestCity && (
        <DualAlertBanner
          homeAreaName={selectedArea.name}
          currentAreaName={locationState.nearestCity.name}
          activeView={activeView}
          onSwitchView={handleSwitchView}
        />
      )}

      {/* Location Toggle */}
      {showLocationToggle && (
        <LocationToggle
          activeView={activeView}
          onToggle={handleToggleView}
          homeHasAlert={homeActiveAlert !== null}
          currentHasAlert={currentActiveAlert !== null}
          currentLocationName={locationState.nearestCity?.name}
        />
      )}

      {/* Main Timer */}
      {displayArea && (
        <CountdownTimer
          selectedArea={displayArea}
          activeAlert={displayActiveAlert}
          alertEnded={displayAlertEnded}
          newsFlash={displayNewsFlash}
          getRemainingTime={displayGetRemainingTime}
          onChangeArea={handleChangeArea}
          allAlerts={displayAlerts}
          timeOffset={displayTimeOffset}
          isCurrentLocation={activeView === 'current'}
        />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  mainContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e'
  },
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
