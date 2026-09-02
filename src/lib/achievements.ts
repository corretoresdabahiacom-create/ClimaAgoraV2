import type { WeatherData } from "../types";
import { getWeatherCodeInfo } from "./weatherCodes";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  // Retorna true se a condição REAL para desbloquear foi satisfeita
  // agora — nunca uma condição aleatória ou decorativa.
  check: (ctx: { weather: WeatherData; streak: number; hour: number }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_rain",
    title: "Dia de Chuva",
    description: "Você acompanhou um dia de chuva real no app.",
    emoji: "🌧️",
    check: ({ weather }) => getWeatherCodeInfo(weather.weatherCode).effect === "rain",
  },
  {
    id: "first_storm",
    title: "Testemunha da Tempestade",
    description: "Você acompanhou uma tempestade real no app.",
    emoji: "⛈️",
    check: ({ weather }) => getWeatherCodeInfo(weather.weatherCode).effect === "storm",
  },
  {
    id: "first_fog",
    title: "Névoa Matinal",
    description: "Você acompanhou um dia de neblina real.",
    emoji: "🌫️",
    check: ({ weather }) => getWeatherCodeInfo(weather.weatherCode).effect === "fog",
  },
  {
    id: "first_snow",
    title: "Floco de Neve",
    description: "Você acompanhou neve real em algum lugar.",
    emoji: "❄️",
    check: ({ weather }) => getWeatherCodeInfo(weather.weatherCode).effect === "snow",
  },
  {
    id: "hot_day",
    title: "Calor de Verdade",
    description: "Sensação térmica real de 35°C ou mais.",
    emoji: "🥵",
    check: ({ weather }) => weather.feelsLike >= 35,
  },
  {
    id: "cold_day",
    title: "Friozinho Real",
    description: "Temperatura real de 15°C ou menos.",
    emoji: "🥶",
    check: ({ weather }) => weather.temp <= 15,
  },
  {
    id: "night_owl",
    title: "Coruja",
    description: "Consultou o clima de madrugada (entre 0h e 5h).",
    emoji: "🦉",
    check: ({ hour }) => hour >= 0 && hour < 5,
  },
  {
    id: "streak_3",
    title: "3 Dias Seguidos",
    description: "Consultou o app 3 dias seguidos de verdade.",
    emoji: "🔥",
    check: ({ streak }) => streak >= 3,
  },
  {
    id: "streak_7",
    title: "Semana Completa",
    description: "Consultou o app 7 dias seguidos de verdade.",
    emoji: "🏆",
    check: ({ streak }) => streak >= 7,
  },
  {
    id: "streak_30",
    title: "Um Mês Inteiro",
    description: "Consultou o app 30 dias seguidos de verdade.",
    emoji: "💎",
    check: ({ streak }) => streak >= 30,
  },
];
