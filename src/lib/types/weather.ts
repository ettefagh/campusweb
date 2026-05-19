export type WeatherAlert = {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
};

export type WeatherAlertResponse = {
  campusId: string;
  campusName: string;
  city: string;
  country: string;
  lastRefreshedAt?: string;
  resolvedLocation?: {
    name: string;
    country: string;
    state?: string;
    lat: number;
    lon: number;
  };
  fetchedAt: string;
  refreshedInSeconds: number;
  alerts: WeatherAlert[];
  source: "openweather";
};
