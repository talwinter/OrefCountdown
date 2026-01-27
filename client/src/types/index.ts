export interface Area {
  name: string;
  migun_time: number;
}

export interface Alert {
  area: string;
  migun_time: number;
  started_at: number;
}

export interface AlertsResponse {
  alerts: Alert[];
  server_time: number;
}
