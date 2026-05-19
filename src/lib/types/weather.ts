export type WeatherAlert = {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
  source?: string;
  severity?: string;
  certainty?: string;
  urgency?: string;
  alertId?: string;
};

export type WeatherCampusAlert = {
  campusId: string;
  campusName: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  fetchedAt: string;
  alerts: WeatherAlert[];
  alertCount: number;
  source: "openweather";
};

export type WeatherStory = {
  title: string;
  summary: string;
  generatedAt: string;
  activeCampusCount: number;
  totalAlertCount: number;
  topCampuses: Array<{
    campusId: string;
    campusName: string;
    alertCount: number;
  }>;
};

export type WeatherAlertResponse = {
  selectedCampusId: string;
  campusId: string;
  campusName: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
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
  campuses: WeatherCampusAlert[];
  activeCampusCount: number;
  totalAlertCount: number;
  story: WeatherStory;
  source: "openweather";
};
