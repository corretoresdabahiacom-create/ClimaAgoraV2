// Tipos do domínio. Todo campo aqui deve corresponder a algo que o backend
// realmente calcula ou obtém de uma fonte real (Open-Meteo/INMET) — nunca
// adicionar um campo "decorativo" sem que a função que o preenche exista.

export interface HourlyPoint {
  time: string; // ISO 8601
  temp: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum: number; // mm previstos para o dia
  weatherCode: number;
  source: "inmet" | "open-meteo";
}

export interface AirQuality {
  usAqi: number | null;
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
}

export interface WeatherData {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  temp: number;
  feelsLike: number;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  precipitation: number; // mm na última hora
  visibility: number | null; // metros
  uvIndex: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string | null; // ISO 8601, horário local
  sunset: string | null; // ISO 8601, horário local
  airQuality: AirQuality | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  source: "open-meteo" | "open-meteo+inmet";
  fetchedAt: string; // ISO 8601 — para a UI mostrar "atualizado há X min"
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string; // ISO 8601
}

export interface InmetAlert {
  id: number;
  event: string; // ex: "Chuva Intensa", "Baixa Umidade", "Onda de Calor"
  severity: string; // valores reais do INMET: "Perigo Potencial" | "Perigo" | "Grande Perigo"
  level: number; // 1, 2 ou 3 — usado para estilo visual (mais confiável que o texto)
  description: string;
  instructions?: string;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  source: "INMET";
  sourceUrl?: string;
}

export type GeocodeResult = {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
};

export interface FavoriteCity {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  role: "user" | "admin";
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  suspended: boolean;
}

export interface Broadcast {
  id: string;
  message: string;
  createdAt: string;
  createdBy: string;
  // Ausente ou null = enviado para todo mundo (comportamento original).
  // Presente = só esses usuários específicos devem ver esse aviso.
  targetUids?: string[] | null;
}

export const TERMS_VERSION = "2026-08-6";

export interface Advertisement {
  id: string;
  type: "text" | "banner" | "mixed";
  title: string;
  description: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  order: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
}
