import { useState, useEffect, useCallback } from 'react';
import { Area, CityGeo, LocationState } from '../types';

const LOCATION_PERMISSION_KEY = 'oref-location-permission';

// Haversine formula to calculate distance between two points
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the nearest city from a list of cities
function findNearestCity(lat: number, lng: number, cities: CityGeo[]): CityGeo | null {
  if (cities.length === 0) return null;

  let nearest: CityGeo | null = null;
  let minDistance = Infinity;

  for (const city of cities) {
    if (city.lat === 0 && city.lng === 0) continue;
    const distance = haversineDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  // If nearest city is more than 100km away, user is likely outside Israel
  if (minDistance > 100) {
    return null;
  }

  return nearest;
}

export function useGeolocation(citiesGeo: CityGeo[]) {
  const [locationState, setLocationState] = useState<LocationState>({
    permission: 'prompt',
    currentPosition: null,
    nearestCity: null,
    error: null
  });

  const [hasAskedPermission, setHasAskedPermission] = useState(false);

  // Check if geolocation is available
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        permission: 'unavailable',
        error: 'Geolocation is not supported by this browser'
      }));
      return;
    }

    // Check cached permission state
    const cachedPermission = localStorage.getItem(LOCATION_PERMISSION_KEY);
    if (cachedPermission === 'granted' || cachedPermission === 'denied') {
      setLocationState(prev => ({
        ...prev,
        permission: cachedPermission as 'granted' | 'denied'
      }));
      setHasAskedPermission(true);
    }

    // Also check the Permissions API if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          setLocationState(prev => ({ ...prev, permission: 'granted' }));
          localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
          setHasAskedPermission(true);
        } else if (result.state === 'denied') {
          setLocationState(prev => ({ ...prev, permission: 'denied' }));
          localStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
          setHasAskedPermission(true);
        }
      }).catch(() => {
        // Permissions API not supported, use cached state
      });
    }
  }, []);

  // Request location permission and get position
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        permission: 'unavailable',
        error: 'Geolocation is not supported'
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude, citiesGeo);

        setLocationState({
          permission: 'granted',
          currentPosition: { lat: latitude, lng: longitude },
          nearestCity: nearest ? {
            name: nearest.name,
            migun_time: nearest.countdown
          } : null,
          error: nearest ? null : 'לא נמצא אזור קרוב'
        });

        localStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
        setHasAskedPermission(true);
      },
      (error) => {
        let errorMessage = 'שגיאה באיתור מיקום';
        let permission: LocationState['permission'] = 'denied';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'הגישה למיקום נדחתה';
            permission = 'denied';
            localStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'מידע המיקום אינו זמין';
            break;
          case error.TIMEOUT:
            errorMessage = 'פג זמן הבקשה לקבלת מיקום';
            break;
        }

        setLocationState(prev => ({
          ...prev,
          permission,
          error: errorMessage
        }));
        setHasAskedPermission(true);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000 // Cache position for 5 minutes
      }
    );
  }, [citiesGeo]);

  // Refresh location (re-request position)
  const refreshLocation = useCallback(() => {
    if (locationState.permission !== 'granted') return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude, citiesGeo);

        setLocationState(prev => ({
          ...prev,
          currentPosition: { lat: latitude, lng: longitude },
          nearestCity: nearest ? {
            name: nearest.name,
            migun_time: nearest.countdown
          } : null,
          error: nearest ? null : 'לא נמצא אזור קרוב'
        }));
      },
      () => {
        // Silently fail on refresh
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0 // Force fresh position
      }
    );
  }, [citiesGeo, locationState.permission]);

  // Dismiss permission prompt (user clicked "not now")
  const dismissPermission = useCallback(() => {
    setHasAskedPermission(true);
  }, []);

  // Auto-request location if permission was previously granted
  useEffect(() => {
    if (locationState.permission === 'granted' && citiesGeo.length > 0 && !locationState.currentPosition) {
      requestLocation();
    }
  }, [locationState.permission, citiesGeo, locationState.currentPosition, requestLocation]);

  return {
    locationState,
    hasAskedPermission,
    requestLocation,
    refreshLocation,
    dismissPermission
  };
}
