export interface Area {
  name: string;
  migun_time: number;
}

export interface Alert {
  area: string;
  migun_time: number;
  started_at: number;
  type?: string;
  instructions?: string;
}

export interface NewsFlash {
  type: 'newsFlash';
  instructions: string;
  timestamp: number;
  areas: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
  newsFlash: NewsFlash | null;
  server_time: number;
}

export interface CityGeo {
  id: number;
  name: string;
  name_en: string;
  countdown: number;
  lat: number;
  lng: number;
  value: string;
}

export interface LocationState {
  permission: 'prompt' | 'granted' | 'denied' | 'unavailable';
  currentPosition: { lat: number; lng: number } | null;
  nearestCity: Area | null;
  error: string | null;
}
