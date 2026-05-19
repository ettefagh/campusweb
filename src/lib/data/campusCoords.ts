export type CampusCoords = {
  lat: number;
  lon: number;
};

export const CAMPUS_COORDS: Record<string, CampusCoords> = {
  bamberg: { lat: 49.8917, lon: 10.8919 },
  berlin: { lat: 52.4758038, lon: 13.4549394 },
  bonn: { lat: 50.7374, lon: 7.0982 },
  bremen: { lat: 53.0793, lon: 8.8017 },
  dresden: { lat: 51.0504, lon: 13.7373 },
  duesseldorf: { lat: 51.2277, lon: 6.7735 },
  fuerth: { lat: 49.4771, lon: 10.9887 },
  gera: { lat: 50.8777, lon: 12.0807 },
  hamburg: { lat: 53.5511, lon: 9.9937 },
  hamm: { lat: 51.6739, lon: 7.815 },
  heide: { lat: 54.1958, lon: 9.0959 },
  heidelberg: { lat: 49.3988, lon: 8.6724 },
  karlsruhe: { lat: 49.0069, lon: 8.4037 },
  cologne: { lat: 50.9375, lon: 6.9603 },
  leipzig: { lat: 51.3397, lon: 12.3731 },
  leverkusen: { lat: 51.0459, lon: 7.0192 },
  munich: { lat: 48.1351, lon: 11.582 },
  munster: { lat: 51.9607, lon: 7.6261 },
  stuttgart: { lat: 48.7758, lon: 9.1829 },
  tuebingen: { lat: 48.5226, lon: 9.0522 }
};
