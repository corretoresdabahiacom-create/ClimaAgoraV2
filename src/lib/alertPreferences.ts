export interface AlertPreferences {
  rainProbabilityThreshold: number | null; // % — avisa se ultrapassar
  uvThreshold: number | null; // índice UV — avisa se ultrapassar
  heatThreshold: number | null; // sensação térmica °C — avisa se ultrapassar
  coldThreshold: number | null; // temperatura °C — avisa se cair abaixo
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  rainProbabilityThreshold: null,
  uvThreshold: null,
  heatThreshold: null,
  coldThreshold: null,
};

export interface TriggeredAlert {
  key: string;
  message: string;
}

// Verifica os limiares REAIS definidos pelo usuário contra o clima REAL
// atual — nunca dispara por um valor inventado, só quando o dado de
// verdade ultrapassa o que a própria pessoa configurou.
export function checkThresholds(
  prefs: AlertPreferences,
  weather: { uvIndex: number; feelsLike: number; temp: number; hourly: { precipitationProbability: number }[] },
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];

  if (prefs.rainProbabilityThreshold != null) {
    const maxPop3h = Math.max(0, ...weather.hourly.slice(0, 3).map((h) => h.precipitationProbability));
    if (maxPop3h >= prefs.rainProbabilityThreshold) {
      triggered.push({
        key: "rain",
        message: `Chance de chuva de ${maxPop3h}% nas próximas horas (seu limite: ${prefs.rainProbabilityThreshold}%).`,
      });
    }
  }

  if (prefs.uvThreshold != null && weather.uvIndex >= prefs.uvThreshold) {
    triggered.push({
      key: "uv",
      message: `Índice UV atual é ${Math.round(weather.uvIndex)} (seu limite: ${prefs.uvThreshold}).`,
    });
  }

  if (prefs.heatThreshold != null && weather.feelsLike >= prefs.heatThreshold) {
    triggered.push({
      key: "heat",
      message: `Sensação térmica de ${Math.round(weather.feelsLike)}° (seu limite: ${prefs.heatThreshold}°).`,
    });
  }

  if (prefs.coldThreshold != null && weather.temp <= prefs.coldThreshold) {
    triggered.push({
      key: "cold",
      message: `Temperatura de ${Math.round(weather.temp)}° (seu limite: ${prefs.coldThreshold}°).`,
    });
  }

  return triggered;
}
