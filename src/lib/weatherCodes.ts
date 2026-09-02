// Mapeamento dos códigos WMO retornados pelo Open-Meteo.
// Referência: https://open-meteo.com/en/docs (seção "WMO Weather interpretation codes")
// Centralizado aqui para que ícone, texto e gradiente NUNCA divirjam entre telas.

export type SkyMood = "clear" | "cloudy" | "rain" | "storm";

// Categoria específica para os EFEITOS VISUAIS ambientes — mais granular
// que o SkyMood (que só controla a cor de fundo). Cada valor mapeia
// diretamente do código real do Open-Meteo, nunca de uma suposição.
export type EffectType =
  | "clear"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

interface WeatherCodeInfo {
  label: string;
  mood: SkyMood;
  effect: EffectType;
  icon: string; // nome do ícone lucide-react
}

const WMO_MAP: Record<number, WeatherCodeInfo> = {
  0: { label: "Céu limpo", mood: "clear", effect: "clear", icon: "Sun" },
  1: { label: "Predomínio de sol", mood: "clear", effect: "clear", icon: "CloudSun" },
  2: { label: "Parcialmente nublado", mood: "cloudy", effect: "cloudy", icon: "CloudSun" },
  3: { label: "Nublado", mood: "cloudy", effect: "cloudy", icon: "Cloud" },
  45: { label: "Neblina", mood: "cloudy", effect: "fog", icon: "CloudFog" },
  48: { label: "Neblina com geada", mood: "cloudy", effect: "fog", icon: "CloudFog" },
  51: { label: "Garoa fraca", mood: "rain", effect: "drizzle", icon: "CloudDrizzle" },
  53: { label: "Garoa moderada", mood: "rain", effect: "drizzle", icon: "CloudDrizzle" },
  55: { label: "Garoa forte", mood: "rain", effect: "drizzle", icon: "CloudDrizzle" },
  61: { label: "Chuva fraca", mood: "rain", effect: "rain", icon: "CloudRain" },
  63: { label: "Chuva moderada", mood: "rain", effect: "rain", icon: "CloudRain" },
  65: { label: "Chuva forte", mood: "rain", effect: "rain", icon: "CloudRain" },
  71: { label: "Neve fraca", mood: "cloudy", effect: "snow", icon: "CloudSnow" },
  73: { label: "Neve moderada", mood: "cloudy", effect: "snow", icon: "CloudSnow" },
  75: { label: "Neve forte", mood: "cloudy", effect: "snow", icon: "CloudSnow" },
  80: { label: "Pancadas de chuva fracas", mood: "rain", effect: "rain", icon: "CloudRainWind" },
  81: { label: "Pancadas de chuva moderadas", mood: "rain", effect: "rain", icon: "CloudRainWind" },
  82: { label: "Pancadas de chuva fortes", mood: "storm", effect: "storm", icon: "CloudRainWind" },
  95: { label: "Tempestade", mood: "storm", effect: "storm", icon: "CloudLightning" },
  96: { label: "Tempestade com granizo", mood: "storm", effect: "storm", icon: "CloudLightning" },
  99: { label: "Tempestade severa com granizo", mood: "storm", effect: "storm", icon: "CloudLightning" },
};

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  return (
    WMO_MAP[code] ?? {
      label: "Condição desconhecida",
      mood: "cloudy",
      effect: "cloudy",
      icon: "Cloud",
    }
  );
}

export function getSkyClassName(mood: SkyMood, isDay: boolean): string {
  const key = `${mood}-${isDay ? "day" : "night"}`;
  const map: Record<string, string> = {
    "clear-day": "sky-clear-day",
    "clear-night": "sky-clear-night",
    "cloudy-day": "sky-cloudy-day",
    "cloudy-night": "sky-cloudy-night",
    "rain-day": "sky-rain",
    "rain-night": "sky-rain",
    "storm-day": "sky-storm",
    "storm-night": "sky-storm",
  };
  return map[key] ?? "sky-cloudy-day";
}
